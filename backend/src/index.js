import { config, logFeatures } from "./config.js";
import { createApp } from "./app.js";
import { startKeeper } from "./keeper.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`pre-settle-backend listening on port ${config.port} (${config.env})`);
  logFeatures();
});

const stopKeeper = startKeeper();

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  stopKeeper();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
