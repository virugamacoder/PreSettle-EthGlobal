// Admin authentication with Sign-In with Ethereum (EIP-4361).
//
// 1. GET  /v1/auth/nonce            -> one-time nonce (valid 5 minutes)
// 2. wallet signs a SIWE message containing that nonce
// 3. POST /v1/auth/verify           -> checks the signature, returns a session token
// 4. admin routes send "Authorization: Bearer <token>"; requireAdmin checks it
//    and that the address is in ADMIN_WALLETS.
import { createHmac, timingSafeEqual } from "node:crypto";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";
import { arcPublic } from "./chains.js";
import { config } from "./config.js";

const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_S = 8 * 60 * 60;
const nonces = new Map(); // nonce -> expiresAt (ms)

export function issueNonce() {
  const now = Date.now();
  for (const [n, exp] of nonces) if (exp < now) nonces.delete(n);
  const nonce = generateSiweNonce();
  nonces.set(nonce, now + NONCE_TTL_MS);
  return nonce;
}

function consumeNonce(nonce) {
  const exp = nonces.get(nonce);
  nonces.delete(nonce); // single use
  return Boolean(exp && exp >= Date.now());
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const sign = (data) => createHmac("sha256", config.auth.secret).update(data).digest("base64url");

export function createSessionToken(address) {
  const payload = b64url(JSON.stringify({ sub: address.toLowerCase(), exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S }));
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  return data.exp > Math.floor(Date.now() / 1000) ? data : null;
}

/** Verifies a signed SIWE message. Returns the signer address or throws. */
export async function verifySignIn(message, signature) {
  const fields = parseSiweMessage(message);
  if (!fields.nonce || !consumeNonce(fields.nonce)) throw httpError(401, "Unknown or expired nonce");
  if (config.auth.siweDomain && fields.domain !== config.auth.siweDomain) throw httpError(401, "Wrong domain");

  const ok = await arcPublic.verifySiweMessage({ message, signature, nonce: fields.nonce });
  if (!ok) throw httpError(401, "Invalid signature");
  return fields.address;
}

export function isAdmin(address) {
  return config.adminWallets.includes(String(address).toLowerCase());
}

/** Express middleware: valid session token from an admin wallet. */
export function requireAdmin(req, res, next) {
  if (!config.auth.secret) return res.status(503).json({ status: "fail", message: "Admin auth not configured" });
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const session = readSessionToken(token);
  if (!session) return res.status(401).json({ status: "fail", message: "Sign in required" });
  if (!isAdmin(session.sub)) return res.status(403).json({ status: "fail", message: "Not an admin wallet" });
  req.admin = session.sub;
  next();
}

// Errors we raise on purpose: their message is safe to send to the client.
export function httpError(status, message) {
  return Object.assign(new Error(message), { status, expose: true });
}
