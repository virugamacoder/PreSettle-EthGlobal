import { Router } from "express";
import { views } from "../services/views.js";

const KEY_RE = /^0x[0-9a-fA-F]{64}$/;

export const viewsRouter = Router();

// POST /v1/views/:key  -> count a view of a listing (deduplicated per visitor)
viewsRouter.post("/:key", (req, res) => {
  const { key } = req.params;
  if (!KEY_RE.test(key)) return res.status(400).json({ status: "fail", message: "Invalid listing key" });
  res.json({ key, views: views.record(key.toLowerCase(), req.ip) });
});

// GET /v1/views?keys=0x..,0x..  -> counts for up to 100 listings
viewsRouter.get("/", (req, res) => {
  const keys = String(req.query.keys ?? "").split(",").map((k) => k.trim().toLowerCase()).filter((k) => KEY_RE.test(k));
  if (keys.length > 100) return res.status(400).json({ status: "fail", message: "At most 100 keys" });
  res.json(views.many(keys));
});
