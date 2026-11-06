import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config, features } from "./config.js";
import { chainStatus, platformAccount } from "./chains.js";
import { ordersRouter } from "./routes/orders.js";
import { authRouter } from "./routes/auth.js";
import { adminBrokersRouter, brokersRouter } from "./routes/brokers.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors(config.corsOrigins.length ? { origin: config.corsOrigins } : undefined));
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

  // Public, non-secret configuration the frontend can read.
  app.get("/v1/config", (req, res) => {
    res.json({
      arc: { chainId: config.arc.chainId, usdc: config.arc.usdc, eurc: config.arc.eurc, contracts: config.arc.contracts },
      ens: { parentName: config.ens.parentName, userRegistry: config.ens.userRegistry ?? null },
      arkiv: { adminAddress: config.arkiv.adminAddress ?? null },
      features,
    });
  });

  // Live connectivity to Arc, Arkiv and Sepolia.
  app.get("/v1/status", async (req, res, next) => {
    try {
      res.json({ chains: await chainStatus(), platformAccount: platformAccount?.address ?? null });
    } catch (err) {
      next(err);
    }
  });

  app.use("/v1/orders", ordersRouter);
  app.use("/v1/auth", authRouter);
  app.use("/v1/brokers", brokersRouter);
  app.use("/v1/admin/brokers", adminBrokersRouter);

  app.use((req, res) => {
    res.status(404).json({ status: "fail", message: "Not found" });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    // Unexpected errors are logged and hidden; deliberate ones (expose) are returned as-is.
    if (!err.expose && status >= 500) console.error(err);
    res.status(status).json({
      status: status >= 500 ? "error" : "fail",
      message: err.expose || status < 500 ? err.message : "Internal server error",
    });
  });

  return app;
}
