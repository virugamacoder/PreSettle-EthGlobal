import { Router } from "express";
import { getAnalytics } from "../services/analytics.js";
import { isArkivRateLimit } from "../chains.js";
import { httpError } from "../auth.js";

export const analyticsRouter = Router();

// GET /v1/analytics: open orders, premarket offers, fills, 24h volume, trending, active makers
analyticsRouter.get("/", async (req, res) => {
  try {
    res.json(await getAnalytics());
  } catch (err) {
    if (isArkivRateLimit(err)) throw httpError(503, "Arkiv query limit reached: set ARKIV_ACCESS_KEY on the backend");
    throw err;
  }
});
