import express from "express";
import helmet from "helmet";
import cors from "cors";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  // Used by the Docker healthcheck, nginx and the deploy workflow.
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      service: "pre-settle-backend",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use((req, res) => {
    res.status(404).json({ status: "fail", message: "Not found" });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
      status: "error",
      message: status >= 500 ? "Internal server error" : err.message,
    });
  });

  return app;
}
