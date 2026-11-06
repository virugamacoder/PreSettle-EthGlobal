export const arcExplorer = {
  tx: (hash) => `https://explorer.testnet.arc.io/tx/${hash}`,
  address: (address) => `https://explorer.testnet.arc.io/address/${address}`,
};

export function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });
export function formatAmount(value) {
  if (value === null || value === undefined || value === "") return "–";
  const n = Number(value);
  return Number.isFinite(n) ? numberFormat.format(n) : String(value);
}

/** "2d 4h", "3h 12m", "45m", "expired" from a unix-seconds deadline. */
export function timeLeft(deadlineSec, nowMs = Date.now()) {
  if (!deadlineSec) return "–";
  let s = Math.floor(deadlineSec - nowMs / 1000);
  if (s <= 0) return "expired";
  const d = Math.floor(s / 86_400);
  s -= d * 86_400;
  const h = Math.floor(s / 3_600);
  const m = Math.floor((s - h * 3_600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${Math.max(m, 1)}m`;
}
