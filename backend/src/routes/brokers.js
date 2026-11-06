import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { LABEL_RE, issueBroker, readBroker, renewBroker, revokeBroker } from "../ens/brokers.js";

const label = z.string().regex(LABEL_RE, "3-32 chars: lowercase letters, digits, hyphen");
const issueBody = z.object({
  label,
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  days: z.number().int().min(1).max(365).default(30),
  maxFeeBps: z.number().int().min(0).max(1_000).default(200),
});
const renewBody = z.object({ days: z.number().int().min(1).max(365) });

function parse(schema, data, res) {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({
      status: "fail",
      message: "Invalid input",
      issues: result.error.issues.map((i) => `${i.path.join(".") || "value"}: ${i.message}`),
    });
    return null;
  }
  return result.data;
}

// Public: broker license lookup (badge + deal gate)
export const brokersRouter = Router();

brokersRouter.get("/:label", async (req, res) => {
  const value = parse(label, req.params.label, res);
  if (value) res.json(await readBroker(value));
});

// Admin: issue / revoke / renew (Sign-In with Ethereum required)
export const adminBrokersRouter = Router();
adminBrokersRouter.use(requireAdmin);

adminBrokersRouter.post("/", async (req, res) => {
  const body = parse(issueBody, req.body, res);
  if (body) res.status(201).json(await issueBroker(body));
});

adminBrokersRouter.post("/:label/revoke", async (req, res) => {
  const value = parse(label, req.params.label, res);
  if (value) res.json(await revokeBroker(value));
});

adminBrokersRouter.post("/:label/renew", async (req, res) => {
  const value = parse(label, req.params.label, res);
  const body = value && parse(renewBody, req.body, res);
  if (body) res.json(await renewBroker(value, body.days));
});
