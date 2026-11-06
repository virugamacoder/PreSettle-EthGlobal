import { Router } from "express";
import { z } from "zod";
import { listOrders } from "../services/orders.js";
import { isArkivRateLimit } from "../chains.js";
import { httpError } from "../auth.js";

const addressParam = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const decimalParam = z.string().regex(/^\d+(\.\d{1,18})?$/);

const querySchema = z.object({
  side: z.enum(["sell", "buy"]).optional(),
  offerToken: addressParam.optional(),
  wantToken: addressParam.optional(),
  maker: addressParam.optional(),
  partial: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  minPrice: decimalParam.optional(),
  maxPrice: decimalParam.optional(),
  cursor: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const ordersRouter = Router();

// GET /v1/orders?side=sell&offerToken=0x..&maxPrice=1.5&limit=50&cursor=0x..
ordersRouter.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid query",
      issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  try {
    res.json(await listOrders(parsed.data));
  } catch (err) {
    if (isArkivRateLimit(err)) {
      throw httpError(503, "Arkiv query limit reached: set ARKIV_ACCESS_KEY on the backend (hub.arkiv.network)");
    }
    throw err;
  }
});
