import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const envFile = path.join(projectRoot, ".env");

if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const separator = normalized.indexOf("=");
    if (separator <= 0) continue;

    const key = normalized.slice(0, separator).trim();
    const value = normalized.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before running Drizzle commands.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
