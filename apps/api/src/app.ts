import fs from "fs";
import path from "path";
import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import router from "./routes";
import { resolveProjectPath } from "./project-root";

const app: Express = express();

function resolveCorsOptions(): CorsOptions {
  const rawOrigin = process.env.CORS_ORIGIN;

  if (!rawOrigin || rawOrigin === "*") {
    return { origin: true };
  }

  return {
    origin: rawOrigin
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

const webDistDir = process.env.WEB_DIST_DIR
  ? path.resolve(process.env.WEB_DIST_DIR)
  : resolveProjectPath("apps", "web", "dist");
const webIndexFile = path.join(webDistDir, "index.html");

app.use(cors(resolveCorsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.SERVE_STATIC !== "false" && fs.existsSync(webIndexFile)) {
  app.use(express.static(webDistDir));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }

    res.sendFile(webIndexFile);
  });
}

export default app;
