import { Router, type IRouter, type Request, type Response } from "express";
import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { projectRoot, resolveProjectPath } from "../project-root";

function findPython(): string | null {
  const configuredPython = process.env.PYTHON_BIN?.trim();
  const candidates = configuredPython
    ? [configuredPython, path.resolve(projectRoot, configuredPython)]
    : process.platform === "win32"
      ? ["python", "python3"]
      : ["python3", "python", "/usr/local/bin/python3", "/usr/bin/python3"];

  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate, ["--version"], { encoding: "utf-8" });
      if (result.status === 0) {
        return candidate;
      }
    } catch {}
  }

  return null;
}

const PYTHON = findPython();

const router: IRouter = Router();

const ROOT = projectRoot;
const RESULTS_DIR = process.env.RESULTS_DIR
  ? path.resolve(ROOT, process.env.RESULTS_DIR)
  : resolveProjectPath("results");
const CHARTS_DIR = path.join(RESULTS_DIR, "charts");
const LOGS_DIR = path.join(RESULTS_DIR, "logs");
const SUMMARY_FILE = path.join(RESULTS_DIR, "summary.json");
const PREDICTION_LOG_FILE = path.join(RESULTS_DIR, "prediction_log.csv");
const CONFIG_FILE = process.env.CONFIG_FILE
  ? path.resolve(ROOT, process.env.CONFIG_FILE)
  : resolveProjectPath("config.yaml");

let runningProcess: ReturnType<typeof spawn> | null = null;
let runStatus: "idle" | "running" | "completed" | "failed" = "idle";
let runReturnCode: number | null = null;
let runLogTail: string[] = [];
let runCurrentStep: number = 0;

// Cache verified actual returns so we never call spawnSync more than once per
// (ticker, date, horizon) — prevents the event-loop from blocking on repeat calls.
const actualReturnCache = new Map<string, { actual: string | null; returnPct: number | null }>();

const MAX_TAIL_LINES = 50;

function safeReadJson(filePath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function safeReadText(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function safeStat(filePath: string): boolean {
  try {
    fs.statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function safeReadDir(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

function readRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

router.get("/summary", (_req: Request, res: Response) => {
  if (!safeStat(SUMMARY_FILE)) {
    res.json({ status: "no_results" });
    return;
  }
  const data = safeReadJson(SUMMARY_FILE);
  if (!data) {
    res.json({ status: "no_results" });
    return;
  }
  res.json({ status: "ok", ...data });
});

router.get("/config", (_req: Request, res: Response) => {
  const raw = safeReadText(CONFIG_FILE) ?? "";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (yaml.load(raw) ?? {}) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  // The YAML is stored in nested format (data:, model:, etc. as top-level keys).
  // If already nested, return directly. If somehow flat, group into sections.
  let config: Record<string, unknown>;
  if (parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)) {
    // Already nested — pass through as-is
    config = {
      data:       parsed.data ?? {},
      model:      parsed.model ?? {},
      backtest:   parsed.backtest ?? {},
      experiment: parsed.experiment ?? {},
      paths:      parsed.paths ?? {},
    };
  } else {
    // Flat format — group into sections
    const DATA_KEYS       = ["ticker","period","train_ratio","val_ratio","seq_len","primary_horizon_idx","target_mode","feature_selection_k","purge_days","tickers","cs_norm_method","align_method"];
    const MODEL_KEYS      = ["epochs","batch_size","lr","patience","threshold","lstm_hidden","lstm_layers","tf_d_model","tf_nhead","tf_layers","tcn_channels","tcn_levels","n_walks"];
    const BACKTEST_KEYS   = ["commission_bps","slippage_bps","impact_coeff","adv_shares","trade_size_shares","confidence_threshold","use_kelly","kelly_fraction","stop_loss_pct","risk_free_annual"];
    const EXPERIMENT_KEYS = ["run_hpo","hpo_trials","deep_wf","run_feature_selection","run_shap","run_baseline","use_multi_ticker"];
    const PATHS_KEYS      = ["results_dir"];
    const pick = (keys: string[]) =>
      Object.fromEntries(keys.filter(k => k in parsed).map(k => [k, parsed[k]]));
    config = {
      data:       pick(DATA_KEYS),
      model:      pick(MODEL_KEYS),
      backtest:   pick(BACKTEST_KEYS),
      experiment: pick(EXPERIMENT_KEYS),
      paths:      pick(PATHS_KEYS),
    };
  }

  res.json({ config, raw_yaml: raw });
});

router.post("/config", (req: Request, res: Response) => {
  const { raw_yaml } = req.body as { raw_yaml?: string };
  if (typeof raw_yaml !== "string") {
    res.status(400).json({ success: false, message: "raw_yaml is required" });
    return;
  }
  try {
    fs.writeFileSync(CONFIG_FILE, raw_yaml, "utf-8");
    res.json({ success: true, message: "Config saved successfully" });
  } catch (err) {
    res.json({ success: false, message: String(err) });
  }
});

router.get("/charts", (_req: Request, res: Response) => {
  const files = safeReadDir(CHARTS_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();
  res.json({ charts: files });
});

router.get("/charts/:filename", (req: Request, res: Response) => {
  const filename = path.basename(readRouteParam(req.params.filename));
  const filePath = path.join(CHARTS_DIR, filename);
  if (!safeStat(filePath) || !filename.endsWith(".png")) {
    res.status(404).json({ error: "Chart not found" });
    return;
  }
  res.setHeader("Content-Type", "image/png");
  res.sendFile(filePath);
});

router.get("/logs", (_req: Request, res: Response) => {
  const files = safeReadDir(LOGS_DIR)
    .filter((f) => f.endsWith(".log"))
    .sort()
    .reverse();
  res.json({ logs: files });
});

router.get("/logs/:filename", (req: Request, res: Response) => {
  const filename = path.basename(readRouteParam(req.params.filename));
  const filePath = path.join(LOGS_DIR, filename);
  if (!safeStat(filePath)) {
    res.status(404).json({ error: "Log file not found" });
    return;
  }
  const content = safeReadText(filePath) ?? "";
  res.json({ filename, content });
});

// ── Helper: fetch actual price return via Python/yfinance ──────
function fetchActualReturn(
  ticker: string,
  predDate: string,
  horizonDays: number = 1
): { actual: string | null; returnPct: number | null } {
  if (!PYTHON) return { actual: null, returnPct: null };

  const cacheKey = `${ticker}:${predDate}:${horizonDays}`;
  if (actualReturnCache.has(cacheKey)) {
    return actualReturnCache.get(cacheKey)!;
  }

  try {
    const script = `
import json, sys
try:
    import yfinance as yf
    from datetime import datetime, timedelta
    ticker = sys.argv[1]
    pred_date_str = sys.argv[2]
    horizon = int(sys.argv[3])
    pred_date = datetime.strptime(pred_date_str[:10], "%Y-%m-%d")
    # fetch window: pred_date to pred_date + horizon + 5 buffer days
    start = pred_date.strftime("%Y-%m-%d")
    end = (pred_date + timedelta(days=horizon + 10)).strftime("%Y-%m-%d")
    df = yf.download(ticker, start=start, end=end, auto_adjust=True, progress=False)
    if isinstance(df.columns, __import__('pandas').MultiIndex):
        df.columns = df.columns.get_level_values(0)
    if len(df) < 2:
        print(json.dumps({"actual": None, "return": None}))
        sys.exit(0)
    # entry: first close on or after pred_date
    # exit:  close horizon trading days later
    entry_price = float(df["Close"].iloc[0])
    exit_idx = min(horizon, len(df) - 1)
    exit_price = float(df["Close"].iloc[exit_idx])
    ret = (exit_price - entry_price) / entry_price
    actual = "UP" if ret >= 0 else "DOWN"
    print(json.dumps({"actual": actual, "return": round(ret, 6)}))
except Exception as e:
    print(json.dumps({"actual": None, "return": None, "error": str(e)}))
`;
    const result = spawnSync(PYTHON, ["-c", script, ticker, predDate, String(horizonDays)], {
      encoding: "utf-8",
      timeout: 15000,
    });
    const out = (result.stdout ?? "").trim();
    const lastLine = out.split("\n").filter(Boolean).pop() ?? "";
    const parsed = JSON.parse(lastLine);
    const value = { actual: parsed.actual ?? null, returnPct: parsed.return ?? null };
    actualReturnCache.set(cacheKey, value);
    return value;
  } catch {
    return { actual: null, returnPct: null };
  }
}

router.get("/prediction-history", (_req: Request, res: Response) => {
  if (!safeStat(PREDICTION_LOG_FILE)) {
    res.json({ rows: [], count: 0 });
    return;
  }
  const csvText = safeReadText(PREDICTION_LOG_FILE) ?? "";
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length === 0) {
    res.json({ rows: [], count: 0 });
    return;
  }
  const headers = lines[0].split(",").map((h) => h.trim());
  const dataLines = lines.slice(1).slice(-100);

  // Load summary for horizon info
  const summary = safeReadJson(SUMMARY_FILE);
  const horizonDays: number = (summary?.prediction_horizon as number) ?? 1;

  const today = new Date();

  const rows = dataLines.map((line) => {
    const vals = line.split(",");
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => { raw[h] = vals[i]?.trim() ?? ""; });

    // Best model prediction for this run
    const bestModel  = raw.best_model ?? "";
    const dirKey     = bestModel.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_dir";
    const confKey    = bestModel.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_conf";
    const predicted  = raw[dirKey] || raw["ensemble_stack_dir"] || "-";
    const confidence = raw[confKey] || raw["ensemble_stack_conf"] || "-";

    // Check if enough time has passed to verify
    const predDate  = raw.date ?? "";
    const predDt    = predDate ? new Date(predDate) : null;
    const daysPast  = predDt ? (today.getTime() - predDt.getTime()) / 86400000 : 0;
    const canVerify = daysPast >= horizonDays;

    let actual: string | null = null;
    let returnPct: number | null = null;

    if (canVerify && raw.ticker && predDate) {
      const result = fetchActualReturn(raw.ticker, predDate, horizonDays);
      actual    = result.actual;
      returnPct = result.returnPct;
    }

    // Hit: prediction matched actual
    const hit = actual !== null && predicted !== "-"
      ? (predicted === actual ? "✓" : "✗")
      : null;

    return {
      date:       predDate,
      ticker:     raw.ticker     ?? "-",
      model:      bestModel      || "-",
      predicted,
      confidence,
      actual:     actual         ?? (canVerify ? "PENDING" : "PENDING"),
      return:     returnPct,
      hit,
      horizon:    horizonDays,
    };
  });

  res.json({ rows, count: rows.length });
});

router.post("/run", (_req: Request, res: Response) => {
  if (runningProcess && runStatus === "running") {
    res.json({
      success: false,
      message: "Pipeline is already running",
      already_running: true,
    });
    return;
  }

  if (!PYTHON) {
    runLogTail = [
      "ERROR: Python is not installed or not available in PATH.",
      "",
      "Install Python 3 locally and install the Python dependencies with `pip install -r requirements.txt`.",
      "If Python is installed outside PATH, set PYTHON_BIN in .env to the full executable path.",
    ];
    runStatus = "failed";
    runReturnCode = -1;
    res.json({ success: false, message: "Python not found", already_running: false });
    return;
  }

  const mainPy = path.join(ROOT, "apps", "ml_engine", "main.py");
  if (!safeStat(mainPy)) {
    runLogTail = [
      `ERROR: main.py not found at: ${mainPy}`,
      "",
      "The ML pipeline entry point (main.py) is missing from apps/ml_engine.",
      "Make sure you have copied your ML pipeline code into apps/ml_engine.",
    ];
    runStatus = "failed";
    runReturnCode = -1;
    res.json({ success: false, message: "main.py not found", already_running: false });
    return;
  }

  runLogTail = [];
  runStatus = "running";
  runReturnCode = null;
  runCurrentStep = 0;

  const proc = spawn(PYTHON, ["-u", path.join("apps", "ml_engine", "main.py")], {
    cwd: ROOT,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });

  runningProcess = proc;

  const appendLog = (data: Buffer) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      const match = line.match(/STEP (\d+)/);
      if (match) {
        runCurrentStep = parseInt(match[1]);
      }
    }
    runLogTail.push(...lines);
    if (runLogTail.length > MAX_TAIL_LINES) {
      runLogTail = runLogTail.slice(-MAX_TAIL_LINES);
    }
  };

  proc.stdout?.on("data", appendLog);
  proc.stderr?.on("data", appendLog);

  proc.on("close", (code) => {
    runReturnCode = code;
    runStatus = code === 0 ? "completed" : "failed";
    runningProcess = null;
  });

  proc.on("error", (err) => {
    runLogTail.push(`Process error: ${err.message}`);
    runStatus = "failed";
    runReturnCode = -1;
    runningProcess = null;
  });

  res.json({ success: true, message: "Pipeline started", already_running: false });
});

router.get("/run/status", (_req: Request, res: Response) => {
  res.json({
    status: runStatus,
    return_code: runReturnCode,
    current_step: runCurrentStep,
    log_tail: runLogTail.slice(-MAX_TAIL_LINES).join("\n"),
  });
});

router.get("/predict/:ticker", (req: Request, res: Response) => {
  const raw = readRouteParam(req.params.ticker);
  const ticker = raw.toUpperCase().replace(/[^A-Z0-9.]/g, "");
  if (!ticker) {
    res.status(400).json({ success: false, ticker: "", error: "Invalid ticker" });
    return;
  }

  if (!PYTHON) {
    res.json({ success: false, ticker, predictions: {}, error: "Python is not installed or not available in PATH. Install Python 3 to use predictions." });
    return;
  }

  const predictPy = path.join(ROOT, "apps", "ml_engine", "predict.py");
  if (!safeStat(predictPy)) {
    res.json({ success: false, ticker, predictions: {}, error: `predict.py not found at apps/ml_engine. Make sure your ML pipeline code is in the workspace.` });
    return;
  }

  try {
    const result = spawnSync(PYTHON, ["-u", path.join("apps", "ml_engine", "predict.py"), "--ticker", ticker, "--format", "json"], {
      cwd: ROOT,
      timeout: 90000,
      encoding: "utf-8",
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    const fullOutput = stdout + stderr;

    // The JSON block is the last { ... } in the output — find the last occurrence
    const jsonStart = fullOutput.lastIndexOf("\n{");
    if (jsonStart === -1) {
      const errSnippet = fullOutput.slice(-400);
      res.json({ success: false, ticker, predictions: {}, error: `No JSON output found. ${errSnippet}` });
      return;
    }

    // Extract the balanced JSON block starting from the found '{'
    let parsed: Record<string, unknown> | null = null;
    try {
      const fromJson = fullOutput.slice(jsonStart + 1);
      let depth = 0;
      let end = -1;
      for (let i = 0; i < fromJson.length; i++) {
        if (fromJson[i] === "{") depth++;
        else if (fromJson[i] === "}") {
          depth--;
          if (depth === 0) { end = i + 1; break; }
        }
      }
      const jsonStr = end > 0 ? fromJson.slice(0, end) : fromJson;
      parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch (parseErr) {
      const snippet = fullOutput.slice(jsonStart).slice(0, 200);
      res.json({ success: false, ticker, predictions: {}, error: `JSON parse failed: ${String(parseErr)} — snippet: ${snippet}` });
      return;
    }

    // predict.py returns { models: [{model_name, probability, direction, strength, confident}], ... }
    // Transform to { ModelName: { direction, confidence, strength } } for the frontend
    type RawModel = { model_name: string; probability: number; direction: string; strength: string; confident: boolean };
    const modelsArray = (parsed.models as RawModel[]) ?? [];
    const predictions: Record<string, unknown> = {};
    for (const m of modelsArray) {
      predictions[m.model_name] = {
        direction: m.direction,
        confidence: m.probability,
        strength: m.strength,
        confident: m.confident,
      };
    }

    res.json({ success: true, ticker, predictions, meta: { best_model: parsed.best_model, forecast_date: parsed.forecast_date } });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.json({ success: false, ticker, predictions: {}, error: errorMsg });
  }
});

export default router;
