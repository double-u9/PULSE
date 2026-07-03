import fs from "fs";
import path from "path";
import { projectRoot } from "./project-root";

function parseEnvValue(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadEnvFile(filePath = path.join(projectRoot, ".env")): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const separator = normalized.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = normalized.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = parseEnvValue(normalized.slice(separator + 1));
  }
}

loadEnvFile();
