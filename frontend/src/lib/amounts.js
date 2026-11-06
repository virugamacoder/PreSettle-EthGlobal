import { parseUnits } from "viem";

const DECIMAL_RE = /^\d+(\.\d+)?$/;
export const isDecimal = (v) => DECIMAL_RE.test(String(v ?? "").trim());

/**
 * amount × price in base units of a token with `outDecimals`, rounded down.
 * Works on decimal strings so no floating-point error reaches the chain.
 */
export function mulToUnits(amount, price, outDecimals) {
  const a = parseUnits(String(amount), 18);
  const p = parseUnits(String(price), 18);
  return (a * p) / 10n ** BigInt(36 - outDecimals);
}

/** Human decimal string × decimal string → decimal string (18 dp max), for display/Arkiv. */
export function mulDecimal(amount, price) {
  const units = mulToUnits(amount, price, 18);
  const s = units.toString().padStart(19, "0");
  const int = s.slice(0, -18);
  const frac = s.slice(-18).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}
