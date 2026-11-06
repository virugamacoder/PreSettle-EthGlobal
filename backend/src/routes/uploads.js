// Image uploads (token logos). Admin-only; stored in DATA_DIR/uploads and
// served at /uploads/<sha256>.<ext>. SVG is refused because it can carry scripts.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import express, { Router } from "express";
import { requireAdmin } from "../auth.js";
import { config } from "../config.js";

export const MAX_UPLOAD_BYTES = 512 * 1024;
export const uploadsDir = () => path.join(config.dataDir, "uploads");

/** Detects the image type from its first bytes (never trust the file name or header alone). */
export function sniffImage(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString("latin1"))) return "gif";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

export const uploadsRouter = Router();

// POST /v1/admin/uploads  (body: the raw image, Content-Type image/png|jpeg|webp|gif)
uploadsRouter.post(
  "/",
  requireAdmin,
  express.raw({ type: ["image/png", "image/jpeg", "image/webp", "image/gif"], limit: MAX_UPLOAD_BYTES }),
  (req, res) => {
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const ext = sniffImage(buf);
    if (!ext) return res.status(415).json({ status: "fail", message: "Upload a PNG, JPEG, WebP or GIF image (max 512 KB)" });

    const name = `${createHash("sha256").update(buf).digest("hex")}.${ext}`;
    const dir = uploadsDir();
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    if (!existsSync(file)) writeFileSync(file, buf);

    const base = (config.baseUrl || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    res.status(201).json({ url: `${base}/uploads/${name}`, bytes: buf.length });
  },
);
