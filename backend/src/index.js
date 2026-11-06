import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3000;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`pre-settle-backend listening on port ${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
