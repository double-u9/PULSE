import { useState, useEffect, useCallback } from "react";
import { useGetConfig, useSaveConfig } from "@pulse/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import {
  Settings2, Save, FileText, AlertCircle, CheckCircle2,
  Database, Brain, TrendingUp, FlaskConical, FolderOpen,
  ChevronDown, ChevronUp, RefreshCw, RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

type SelectOption = { value: number | string; label: string };
type FieldValue = string | number | boolean | string[];
type ConfigValues = Record<string, Record<string, FieldValue>>;

// ── Default values — single source of truth for Reset ─────────
const DEFAULTS: ConfigValues = {
  data: {
    ticker: "AAPL",
    period: "10y",
    train_ratio: 0.70,
    val_ratio: 0.15,
    seq_len: 50,
    primary_horizon_idx: 0,
    target_mode: "binary",
    feature_selection_k: 60,
    purge_days: 5,
    tickers: "AAPL,MSFT,GOOGL,AMZN,NVDA",
    cs_norm_method: "zscore",
    align_method: "inner",
  },
  model: {
    epochs: 80,
    batch_size: 64,
    lr: 0.0003,
    patience: 15,
    threshold: 0.50,
    lstm_hidden: 64,
    lstm_layers: 2,
    tf_d_model: 64,
    tf_nhead: 4,
    tf_layers: 2,
    tcn_channels: 32,
    tcn_levels: 4,
    n_walks: 8,
  },
  backtest: {
    commission_bps: 1.0,
    slippage_bps: 2.0,
    impact_coeff: 0.1,
    adv_shares: 10000000,
    trade_size_shares: 1000,
    confidence_threshold: 0.0,
    use_kelly: true,
    kelly_fraction: 0.20,
    stop_loss_pct: 0.05,
    risk_free_annual: 0.05,
  },
  experiment: {
    run_hpo: false,
    hpo_trials: 20,
    deep_wf: false,
    run_feature_selection: true,
    run_shap: true,
    run_baseline: true,
    use_multi_ticker: false,
  },
  paths: {
    results_dir: "results",
  },
};

// ── Default raw YAML text ──────────────────────────────────────
const DEFAULT_RAW_YAML = `# config.yaml — Human-Editable Configuration Override File

# ── Data ──────────────────────────────────────────────────────
data:
  ticker: "AAPL"                    # Primary ticker for single-asset mode
  period: "10y"                     # yfinance period string (e.g. 5y, 7y, 10y)
  train_ratio: 0.70                 # Fraction of dates for training
  val_ratio: 0.15                   # Fraction of dates for validation
  seq_len: 50                       # Bars per input sequence for deep models
  primary_horizon_idx: 0            # 0=next day, 1=next week (5d), 2=next month (21d)
  target_mode: "binary"             # binary | return | excess_return | rank
  feature_selection_k: 60           # Top-K features to keep (null = keep all)
  purge_days: 5                     # Embargo days between folds in walk-forward
  tickers: [AAPL, MSFT, GOOGL, AMZN, NVDA]  # Universe for multi-ticker mode
  cs_norm_method: "zscore"          # Cross-sectional norm: zscore | rank | none
  align_method: "inner"             # inner=common dates only, outer=all dates

# ── Model training ────────────────────────────────────────────
model:
  epochs: 80
  batch_size: 64
  lr: 0.0003
  patience: 15                      # Early stopping patience (epochs)
  threshold: 0.50                   # Probability threshold for binary prediction
  lstm_hidden: 64
  lstm_layers: 2
  tf_d_model: 64
  tf_nhead: 4
  tf_layers: 2
  tcn_channels: 32
  tcn_levels: 4
  n_walks: 8                        # Walk-forward folds

# ── Backtest / risk ───────────────────────────────────────────
backtest:
  commission_bps: 1.0               # One-way broker commission
  slippage_bps: 2.0                 # One-way half-spread + timing slippage
  impact_coeff: 0.1                 # Market impact coefficient λ
  adv_shares: 10000000              # Average daily volume for impact calculation
  trade_size_shares: 1000           # Notional trade size for impact calculation
  confidence_threshold: 0.0         # Min |p - 0.5| to execute a signal
  use_kelly: true                   # Use fractional Kelly position sizing
  kelly_fraction: 0.20              # Conservative Kelly multiplier
  stop_loss_pct: 0.05               # Max unrealised loss before forced exit
  risk_free_annual: 0.05

# ── Experiment flags ──────────────────────────────────────────
experiment:
  run_hpo: false                    # Per-model Optuna hyperparameter search
  hpo_trials: 20                    # Optuna trials per model
  deep_wf: false                    # Train deep models in each walk-forward fold
  run_feature_selection: true
  run_shap: true
  run_baseline: true                # Always compare vs MA-crossover baseline
  use_multi_ticker: false

# ── Output paths ──────────────────────────────────────────────
paths:
  results_dir: "results"
`;

function toNum(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function toYaml(cfg: ConfigValues): string {
  const b = (v: unknown) => (v === true || v === "true" ? "true" : "false");
  const tickers = cfg.data?.tickers ?? "AAPL,MSFT,GOOGL,AMZN,NVDA";
  const tickerList = String(tickers).split(",").map((t) => t.trim()).join(", ");
  return [
    "# config.yaml — Human-Editable Configuration Override File",
    "",
    "# ── Data ──────────────────────────────────────────────────────",
    "data:",
    `  ticker: "${cfg.data?.ticker ?? ""}"`,
    `  period: "${cfg.data?.period ?? ""}"`,
    `  train_ratio: ${toNum(cfg.data?.train_ratio)}`,
    `  val_ratio:   ${toNum(cfg.data?.val_ratio)}`,
    `  seq_len:     ${toNum(cfg.data?.seq_len)}`,
    `  primary_horizon_idx: ${toNum(cfg.data?.primary_horizon_idx)}`,
    `  target_mode: "${cfg.data?.target_mode ?? "binary"}"`,
    `  feature_selection_k: ${toNum(cfg.data?.feature_selection_k)}`,
    `  purge_days:  ${toNum(cfg.data?.purge_days)}`,
    `  tickers: [${tickerList}]`,
    `  cs_norm_method: "${cfg.data?.cs_norm_method ?? "zscore"}"`,
    `  align_method: "${cfg.data?.align_method ?? "inner"}"`,
    "",
    "# ── Model training ────────────────────────────────────────────",
    "model:",
    `  epochs:      ${toNum(cfg.model?.epochs)}`,
    `  batch_size:  ${toNum(cfg.model?.batch_size)}`,
    `  lr:          ${toNum(cfg.model?.lr)}`,
    `  patience:    ${toNum(cfg.model?.patience)}`,
    `  threshold:   ${toNum(cfg.model?.threshold)}`,
    `  lstm_hidden: ${toNum(cfg.model?.lstm_hidden)}`,
    `  lstm_layers: ${toNum(cfg.model?.lstm_layers)}`,
    `  tf_d_model:  ${toNum(cfg.model?.tf_d_model)}`,
    `  tf_nhead:    ${toNum(cfg.model?.tf_nhead)}`,
    `  tf_layers:   ${toNum(cfg.model?.tf_layers)}`,
    `  tcn_channels: ${toNum(cfg.model?.tcn_channels)}`,
    `  tcn_levels:  ${toNum(cfg.model?.tcn_levels)}`,
    `  n_walks:     ${toNum(cfg.model?.n_walks)}`,
    "",
    "# ── Backtest / risk ───────────────────────────────────────────",
    "backtest:",
    `  commission_bps:       ${toNum(cfg.backtest?.commission_bps)}`,
    `  slippage_bps:         ${toNum(cfg.backtest?.slippage_bps)}`,
    `  impact_coeff:         ${toNum(cfg.backtest?.impact_coeff)}`,
    `  adv_shares:           ${toNum(cfg.backtest?.adv_shares)}`,
    `  trade_size_shares:    ${toNum(cfg.backtest?.trade_size_shares)}`,
    `  confidence_threshold: ${toNum(cfg.backtest?.confidence_threshold)}`,
    `  use_kelly:            ${b(cfg.backtest?.use_kelly)}`,
    `  kelly_fraction:       ${toNum(cfg.backtest?.kelly_fraction)}`,
    `  stop_loss_pct:        ${toNum(cfg.backtest?.stop_loss_pct)}`,
    `  risk_free_annual:     ${toNum(cfg.backtest?.risk_free_annual)}`,
    "",
    "# ── Experiment flags ──────────────────────────────────────────",
    "experiment:",
    `  run_hpo:               ${b(cfg.experiment?.run_hpo)}`,
    `  hpo_trials:            ${toNum(cfg.experiment?.hpo_trials)}`,
    `  deep_wf:               ${b(cfg.experiment?.deep_wf)}`,
    `  run_feature_selection: ${b(cfg.experiment?.run_feature_selection)}`,
    `  run_shap:              ${b(cfg.experiment?.run_shap)}`,
    `  run_baseline:          ${b(cfg.experiment?.run_baseline)}`,
    `  use_multi_ticker:      ${b(cfg.experiment?.use_multi_ticker)}`,
    "",
    "# ── Output paths ──────────────────────────────────────────────",
    "paths:",
    `  results_dir: "${cfg.paths?.results_dir ?? ""}"`,
  ].join("\n");
}

const SECTIONS = [
  {
    key: "data",
    label: "Data",
    icon: Database,
    color: "text-blue-400",
    fields: [
      { key: "ticker", label: "Ticker Symbol", type: "text", desc: "Primary ticker for single-asset mode (e.g. AAPL, NVDA)" },
      { key: "period", label: "History Period", type: "text", desc: "yfinance period string (e.g. 10y, 5y, 2y)" },
      { key: "primary_horizon_idx", label: "Prediction Horizon", type: "select", desc: "Forecast horizon the pipeline trains and predicts on", options: [{ value: 0, label: "0 — Tomorrow (1 day)" }, { value: 1, label: "1 — Next Week (5 days)" }, { value: 2, label: "2 — Next Month (21 days)" }] },
      { key: "target_mode", label: "Target Mode", type: "select", desc: "What the model predicts: direction, return, excess return, or rank", options: [{ value: "binary", label: "binary — up/down direction" }, { value: "return", label: "return — raw log return" }, { value: "excess_return", label: "excess_return — alpha signal" }, { value: "rank", label: "rank — cross-sectional percentile" }] },
      { key: "train_ratio", label: "Training Split", type: "number", step: 0.01, min: 0.3, max: 0.9, desc: "Fraction of dates used for training" },
      { key: "val_ratio", label: "Validation Split", type: "number", step: 0.01, min: 0.05, max: 0.3, desc: "Fraction of dates held out for validation" },
      { key: "seq_len", label: "Sequence Length", type: "number", step: 1, min: 10, max: 200, desc: "Look-back window in bars fed to deep models" },
      { key: "feature_selection_k", label: "Feature Selection K", type: "number", step: 1, min: 10, max: 200, desc: "Top-K features to keep after MI+XGB selection" },
      { key: "purge_days", label: "Purge Days", type: "number", step: 1, min: 0, max: 30, desc: "Embargo gap between train and test in each fold" },
      { key: "tickers", label: "Ticker Universe", type: "text", desc: "Comma-separated list for multi-ticker mode (e.g. AAPL,MSFT,GOOGL)" },
      { key: "cs_norm_method", label: "Cross-Sectional Norm", type: "select", desc: "Normalisation applied across tickers on each date", options: [{ value: "zscore", label: "zscore" }, { value: "rank", label: "rank" }, { value: "none", label: "none" }] },
      { key: "align_method", label: "Alignment Method", type: "select", desc: "How to align dates across tickers", options: [{ value: "inner", label: "inner — common dates only" }, { value: "outer", label: "outer — all dates" }] },
    ],
  },
  {
    key: "model",
    label: "Model Training",
    icon: Brain,
    color: "text-purple-400",
    fields: [
      { key: "epochs", label: "Epochs", type: "number", step: 1, min: 10, max: 500, desc: "Maximum training epochs per model" },
      { key: "batch_size", label: "Batch Size", type: "number", step: 1, min: 8, max: 512, desc: "Samples per gradient update" },
      { key: "lr", label: "Learning Rate", type: "number", step: 0.00001, min: 0.00001, max: 0.01, desc: "Adam optimizer learning rate" },
      { key: "patience", label: "Early-Stop Patience", type: "number", step: 1, min: 1, max: 100, desc: "Stop training after N epochs without improvement" },
      { key: "threshold", label: "Decision Threshold", type: "number", step: 0.01, min: 0.0, max: 1.0, desc: "Probability threshold for binary prediction" },
      { key: "lstm_hidden", label: "LSTM Hidden Size", type: "number", step: 1, min: 16, max: 512, desc: "Hidden dimension for LSTM and GRU models" },
      { key: "lstm_layers", label: "LSTM Layers", type: "number", step: 1, min: 1, max: 6, desc: "Number of stacked LSTM/GRU layers" },
      { key: "tf_d_model", label: "Transformer d_model", type: "number", step: 1, min: 16, max: 512, desc: "Embedding dimension for Transformer" },
      { key: "tf_nhead", label: "Transformer Heads", type: "number", step: 1, min: 1, max: 16, desc: "Number of attention heads (must divide d_model)" },
      { key: "tf_layers", label: "Transformer Layers", type: "number", step: 1, min: 1, max: 8, desc: "Number of Transformer encoder layers" },
      { key: "tcn_channels", label: "TCN Channels", type: "number", step: 1, min: 8, max: 256, desc: "Output channels per TCN block" },
      { key: "tcn_levels", label: "TCN Levels", type: "number", step: 1, min: 1, max: 8, desc: "Number of TCN dilation levels" },
      { key: "n_walks", label: "Walk-Forward Folds", type: "number", step: 1, min: 3, max: 20, desc: "Number of expanding-window folds" },
    ],
  },
  {
    key: "backtest",
    label: "Backtest / Risk",
    icon: TrendingUp,
    color: "text-green-400",
    fields: [
      { key: "commission_bps", label: "Commission (bps)", type: "number", step: 0.1, min: 0, max: 50, desc: "One-way broker commission in basis points" },
      { key: "slippage_bps", label: "Slippage (bps)", type: "number", step: 0.1, min: 0, max: 50, desc: "One-way half-spread + timing slippage" },
      { key: "impact_coeff", label: "Impact Coefficient λ", type: "number", step: 0.01, min: 0, max: 1, desc: "Market impact coefficient (square-root law)" },
      { key: "adv_shares", label: "ADV Shares", type: "number", step: 100000, min: 0, max: 100000000, desc: "Average daily volume for impact calculation" },
      { key: "trade_size_shares", label: "Trade Size (shares)", type: "number", step: 100, min: 0, max: 100000, desc: "Notional trade size for impact calculation" },
      { key: "confidence_threshold", label: "Signal Confidence Filter", type: "number", step: 0.01, min: 0.0, max: 0.5, desc: "Min |p - 0.5| to execute a signal (0 = trade everything)" },
      { key: "use_kelly", label: "Use Kelly Sizing", type: "boolean", desc: "Size positions using Kelly criterion" },
      { key: "kelly_fraction", label: "Kelly Fraction", type: "number", step: 0.05, min: 0.05, max: 1.0, desc: "Conservative Kelly multiplier (0.2 = 20% of full Kelly)" },
      { key: "stop_loss_pct", label: "Stop Loss %", type: "number", step: 0.01, min: 0, max: 0.5, desc: "Max unrealised loss before forced exit (0 = disabled)" },
      { key: "risk_free_annual", label: "Risk-Free Rate", type: "number", step: 0.001, min: 0, max: 0.1, desc: "Annualised risk-free rate for Sharpe calculation" },
    ],
  },
  {
    key: "experiment",
    label: "Experiment Flags",
    icon: FlaskConical,
    color: "text-yellow-400",
    fields: [
      { key: "run_hpo", label: "Run HPO", type: "boolean", desc: "Per-model Optuna hyperparameter search (slow)" },
      { key: "hpo_trials", label: "HPO Trials", type: "number", step: 1, min: 5, max: 200, desc: "Number of Optuna trials when HPO is enabled" },
      { key: "deep_wf", label: "Deep Walk-Forward", type: "boolean", desc: "Train deep models in each walk-forward fold" },
      { key: "run_feature_selection", label: "Feature Selection", type: "boolean", desc: "Run MI + XGBoost feature selection before training" },
      { key: "run_shap", label: "SHAP Explainability", type: "boolean", desc: "Generate SHAP feature attribution after training" },
      { key: "run_baseline", label: "Run Baseline", type: "boolean", desc: "Always compare vs MA-crossover baseline strategy" },
      { key: "use_multi_ticker", label: "Multi-Ticker Mode", type: "boolean", desc: "Train across all tickers in the universe and show ranking" },
    ],
  },
  {
    key: "paths",
    label: "Paths",
    icon: FolderOpen,
    color: "text-orange-400",
    fields: [
      { key: "results_dir", label: "Results Directory", type: "text", desc: "Where checkpoints, charts, and logs are saved" },
    ],
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="switch"
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
        checked ? "bg-primary" : "bg-secondary border border-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionCard({
  section,
  values,
  onChange,
}: {
  section: (typeof SECTIONS)[0];
  values: Record<string, FieldValue>;
  onChange: (key: string, val: FieldValue) => void;
}) {
  const [open, setOpen] = useState(true);
  const Icon = section.icon;

  return (
    <Card className="overflow-hidden border-border/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-secondary/40 hover:bg-secondary/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${section.color}`} />
          <span className="font-semibold text-base">{section.label}</span>
          <Badge variant="outline" className="text-[10px] font-mono">
            {section.fields.length} fields
          </Badge>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border/40">
              {section.fields.map((field) => {
                const val = values[field.key];
                return (
                  <div key={field.key} className="px-5 py-4 flex items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{field.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{field.desc}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {field.type === "boolean" ? (
                        <Toggle
                          checked={val === true || val === "true"}
                          onChange={(v) => onChange(field.key, v)}
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={String(val ?? "")}
                          onChange={(e) => {
                            const opt = (field as { options: SelectOption[] }).options?.find(
                              (o) => String(o.value) === e.target.value
                            );
                            onChange(field.key, opt?.value ?? e.target.value);
                          }}
                          className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary min-w-[160px]"
                        >
                          {(field as { options: SelectOption[] }).options?.map((o) => (
                            <option key={String(o.value)} value={String(o.value)}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={String(val ?? "")}
                          step={(field as { step?: number }).step}
                          min={(field as { min?: number }).min}
                          max={(field as { max?: number }).max}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const parsed =
                              field.type === "number"
                                ? raw === "" ? "" : parseFloat(raw)
                                : raw;
                            onChange(field.key, parsed as FieldValue);
                          }}
                          className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm font-mono w-36 focus:outline-none focus:ring-1 focus:ring-primary text-right"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function Config() {
  const { data, isLoading } = useGetConfig();
  const saveMutation = useSaveConfig();
  const queryClient = useQueryClient();

  const [formValues, setFormValues] = useState<ConfigValues>(DEFAULTS);
  const [rawYaml, setRawYaml] = useState(DEFAULT_RAW_YAML);
  const [tab, setTab] = useState<"form" | "raw">("form");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [resetStatus, setResetStatus] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── Normalize flat config → nested sections ──────────────────
  const normalizeConfig = useCallback((flat: Record<string, unknown>): ConfigValues => {
    const DATA_KEYS       = ["ticker","period","train_ratio","val_ratio","seq_len","primary_horizon_idx","target_mode","feature_selection_k","purge_days","tickers","cs_norm_method","align_method"];
    const MODEL_KEYS      = ["epochs","batch_size","lr","patience","threshold","lstm_hidden","lstm_layers","tf_d_model","tf_nhead","tf_layers","tcn_channels","tcn_levels","n_walks"];
    const BACKTEST_KEYS   = ["commission_bps","slippage_bps","impact_coeff","adv_shares","trade_size_shares","confidence_threshold","use_kelly","kelly_fraction","stop_loss_pct","risk_free_annual"];
    const EXPERIMENT_KEYS = ["run_hpo","hpo_trials","deep_wf","run_feature_selection","run_shap","run_baseline","use_multi_ticker"];
    const PATHS_KEYS      = ["results_dir"];

    const pick = (keys: string[]) =>
      Object.fromEntries(keys.filter(k => k in flat).map(k => [k, flat[k] as FieldValue]));

    // If already nested (has a "data" key that is an object), return as-is
    if (flat.data && typeof flat.data === "object" && !Array.isArray(flat.data)) {
      return flat as unknown as ConfigValues;
    }

    // Otherwise it's flat — group into sections
    return {
      data:       { ...DEFAULTS.data,       ...pick(DATA_KEYS) },
      model:      { ...DEFAULTS.model,      ...pick(MODEL_KEYS) },
      backtest:   { ...DEFAULTS.backtest,   ...pick(BACKTEST_KEYS) },
      experiment: { ...DEFAULTS.experiment, ...pick(EXPERIMENT_KEYS) },
      paths:      { ...DEFAULTS.paths,      ...pick(PATHS_KEYS) },
    };
  }, []);

  useEffect(() => {
    if (data) {
      const cfg = data.config as Record<string, unknown> | undefined;
      // Only update form if the config has at least one section — an empty object
      // means the YAML failed to parse on the server and we keep existing values
      if (cfg && Object.keys(cfg).length > 0) {
        setFormValues(normalizeConfig(cfg));
      }
      if (data.raw_yaml) setRawYaml(data.raw_yaml);
      setIsDirty(false);
    }
  }, [data, normalizeConfig]);

  const handleFieldChange = useCallback((section: string, key: string, val: FieldValue) => {
    setFormValues((prev) => {
      const next = { ...prev, [section]: { ...prev[section], [key]: val } };
      setRawYaml(toYaml(next));
      return next;
    });
    setIsDirty(true);
    setResetStatus(false);
  }, []);

  const handleTabSwitch = (nextTab: "form" | "raw") => {
    if (tab === "form" && nextTab === "raw") {
      setRawYaml(toYaml(formValues));
    }
    setTab(nextTab);
  };

  const handleSave = () => {
    setSaveStatus("idle");
    const yamlToSend = tab === "form" ? toYaml(formValues) : rawYaml;
    saveMutation.mutate(
      { data: { raw_yaml: yamlToSend } },
      {
        onSuccess: () => {
          setSaveStatus("success");
          setIsDirty(false);
          setResetStatus(false);
          queryClient.invalidateQueries({ queryKey: ["/api/config"] });
          setTimeout(() => setSaveStatus("idle"), 3000);
        },
        onError: () => {
          setSaveStatus("error");
          setTimeout(() => setSaveStatus("idle"), 4000);
        },
      }
    );
  };

  // ── FIXED: Reset restores hardcoded defaults, does NOT save ───
  const handleReset = () => {
    setFormValues(DEFAULTS);
    setRawYaml(DEFAULT_RAW_YAML);
    setIsDirty(true);
    setResetStatus(true);
    setTimeout(() => setResetStatus(false), 4000);
  };

  if (isLoading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Settings2 className="w-12 h-12 text-primary mb-4 animate-spin" style={{ animationDuration: "3s" }} />
          <p className="text-muted-foreground font-mono">Loading configuration...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings2 className="text-primary" /> Configuration
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Edit and save your <span className="font-mono text-foreground">config.yaml</span> settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && !resetStatus && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded"
            >
              unsaved changes
            </motion.span>
          )}

          {/* Reset button — visually distinct (outline, different icon) */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2 text-sm px-3 border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
          </Button>

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2"
          >
            {saveMutation.isPending ? (
              <><Save className="w-4 h-4 animate-pulse" /> Saving...</>
            ) : saveStatus === "success" ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            ) : saveStatus === "error" ? (
              <><AlertCircle className="w-4 h-4" /> Error</>
            ) : (
              <><Save className="w-4 h-4" /> Save Config</>
            )}
          </Button>
        </div>
      </div>

      {/* Reset confirmation banner */}
      <AnimatePresence>
        {resetStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-sm"
          >
            <RotateCcw className="w-4 h-4 flex-shrink-0" />
            Reset to defaults — click <span className="font-semibold mx-1">Save Config</span> to apply
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save error banner */}
      <AnimatePresence>
        {saveStatus === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to save configuration. Check the server is running and try again.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Switcher */}
      <div className="inline-flex bg-secondary/50 rounded-lg p-1 gap-1 border border-border">
        {(["form", "raw"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabSwitch(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "form" ? (
              <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Form</span>
            ) : (
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Raw YAML</span>
            )}
          </button>
        ))}
      </div>

      {/* Form view */}
      {tab === "form" && (
        <div className="space-y-3">
          {SECTIONS.map((section) => (
            <SectionCard
              key={section.key}
              section={section}
              values={formValues[section.key] ?? {}}
              onChange={(key, val) => handleFieldChange(section.key, key, val)}
            />
          ))}
        </div>
      )}

      {/* Raw YAML view */}
      {tab === "raw" && (
        <Card className="flex flex-col h-[70vh] border-primary/20">
          <div className="bg-secondary/80 border-b border-border p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
              <FileText className="w-4 h-4 text-primary" /> config.yaml
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {rawYaml.split("\n").length} lines
            </span>
          </div>
          <textarea
            value={rawYaml}
            onChange={(e) => {
              setRawYaml(e.target.value);
              setIsDirty(true);
              setResetStatus(false);
            }}
            className="flex-1 w-full bg-[#0d1117] text-[#c9d1d9] font-mono p-6 resize-none focus:outline-none"
            spellCheck={false}
            style={{ lineHeight: "1.6", fontSize: "13px" }}
          />
        </Card>
      )}
    </div>
  );
}
