import "./env";
import app from "./app";

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException] Server will continue:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] Server will continue:", reason);
});

const rawPort = process.env.PORT ?? process.env.API_PORT ?? "3000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid API port value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
