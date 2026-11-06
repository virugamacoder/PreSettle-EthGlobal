import { Router } from "express";
import { getPrices } from "../services/prices.js";

export const pricesRouter = Router();

// GET /v1/prices?ids=3408,20641  -> { "3408": { symbol, name, usd, updatedAt } | null, ... }
pricesRouter.get("/", async (req, res) => {
  const ids = [...new Set(String(req.query.ids ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  if (!ids.length || ids.length > 50 || !ids.every((id) => /^\d{1,7}$/.test(id))) {
    return res.status(400).json({ status: "fail", message: "ids must be 1-50 CoinMarketCap IDs, e.g. ?ids=3408,20641" });
  }
  res.json(await getPrices(ids));
});
