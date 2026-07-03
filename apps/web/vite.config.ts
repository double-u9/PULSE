import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

function readPort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const port = Number(value);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid port value: "${value}"`);
  }

  return port;
}

const rootDir = path.resolve(import.meta.dirname);
const projectRoot = path.resolve(rootDir, "..", "..");

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, projectRoot, ""), ...process.env };
  const port = readPort(env.WEB_PORT, 5173);
  const apiPort = readPort(env.API_PORT, 3000);
  const apiTarget = env.VITE_API_PROXY_TARGET ?? `http://localhost:${apiPort}`;

  return {
    base: env.BASE_PATH ?? "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: rootDir,
    build: {
      outDir: path.resolve(rootDir, "dist"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: env.HOST ?? "localhost",
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      host: env.HOST ?? "localhost",
    },
  };
});
