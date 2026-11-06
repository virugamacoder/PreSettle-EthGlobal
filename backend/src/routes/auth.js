import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { createSessionToken, isAdmin, issueNonce, verifySignIn } from "../auth.js";

const verifyBody = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export const authRouter = Router();

authRouter.get("/nonce", (req, res) => {
  res.json({ nonce: issueNonce() });
});

authRouter.post("/verify", async (req, res) => {
  if (!config.auth.secret) return res.status(503).json({ status: "fail", message: "Admin auth not configured" });
  const body = verifyBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ status: "fail", message: "message and signature are required" });

  const address = await verifySignIn(body.data.message, body.data.signature);
  res.json({ address, admin: isAdmin(address), token: createSessionToken(address) });
});
