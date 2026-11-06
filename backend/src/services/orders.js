import { and, asc, eq, gt, gte, lte } from "@arkiv-network/sdk/query";
import { addr, dec, key } from "@arkiv-network/sdk/schema";
import { arkivPublic } from "../chains.js";
import { OtcOrder } from "../arkiv/schemas.js";
import { readOrders } from "../contracts/otc.js";
import { features } from "../config.js";
import { views } from "./views.js";

const SELECT = {
  $key: true,
  $owner: true,
  $expiresAt: true,
  maker: true,
  side: true,
  offerToken: true,
  wantToken: true,
  price: true,
  amount: true,
  partial: true,
  orderId: true,
  deadline: true,
  broker: true,
  brokerEns: true,
  makerEns: true,
  arcTx: true,
  termsRef: true,
};

// Arkiv rows -> plain JSON (values come back wrapped: row.col.value).
function toOrder(row) {
  const v = (col) => (row[col] === undefined ? null : row[col].value ?? row[col]);
  return {
    key: row.$key,
    owner: row.$owner,
    expiresAtBlock: row.$expiresAt?.toString() ?? null,
    maker: v("maker"),
    side: v("side"),
    offerToken: v("offerToken"),
    wantToken: v("wantToken"),
    price: v("price"),
    amount: v("amount"),
    partial: v("partial"),
    orderId: v("orderId")?.toString() ?? null,
    deadline: v("deadline") !== null ? Number(v("deadline")) : null,
    broker: v("broker"),
    brokerEns: v("brokerEns"),
    makerEns: v("makerEns"),
    arcTx: v("arcTx"),
    termsRef: v("termsRef"),
    views: views.get(String(row.$key).toLowerCase()),
  };
}

function buildWhere(filters) {
  const conditions = [];
  if (filters.side) conditions.push(eq("side", filters.side));
  if (filters.offerToken) conditions.push(eq("offerToken", addr(filters.offerToken)));
  if (filters.wantToken) conditions.push(eq("wantToken", addr(filters.wantToken)));
  if (filters.maker) conditions.push(eq("maker", addr(filters.maker)));
  if (filters.partial !== undefined) conditions.push(eq("partial", filters.partial));
  if (filters.minPrice) conditions.push(gte("price", dec(filters.minPrice)));
  if (filters.maxPrice) conditions.push(lte("price", dec(filters.maxPrice)));
  if (filters.cursor) conditions.push(gt("$key", key(filters.cursor)));
  return conditions;
}

/**
 * Checks one Arkiv listing against the on-chain order:
 * the listing owner must be the maker, and the order must still be open.
 */
export function verify(order, onchain, nowSec) {
  if (!onchain) return { verified: false, reason: "order not found on Arc" };
  if (onchain.error) return { verified: false, reason: onchain.error };
  if (onchain.maker.toLowerCase() !== order.owner.toLowerCase())
    return { verified: false, reason: "listing owner is not the on-chain maker" };
  if (onchain.cancelled) return { verified: false, reason: "cancelled" };
  if (Number(onchain.deadline) <= nowSec) return { verified: false, reason: "expired" };
  const remaining = onchain.offerAmount - onchain.filledOffer;
  if (remaining <= 0n) return { verified: false, reason: "fully filled" };
  return { verified: true, remainingOffer: remaining.toString() };
}

/**
 * Lists OTC orders from Arkiv. When the OTC contract is configured, every
 * row is verified on Arc and invalid/spoofed rows are dropped.
 */
export async function listOrders(filters) {
  let query = arkivPublic.select(SELECT).from(OtcOrder);
  for (const condition of buildWhere(filters)) query = query.where(condition);
  const page = await query.orderBy(asc("$key")).limit(filters.limit).fetch();

  const orders = page.entities.map(toOrder);
  const nextCursor = orders.length === filters.limit ? orders.at(-1).key : null;

  if (!features.otc) {
    return {
      orders: orders.map((o) => ({ ...o, verified: null })),
      verification: "skipped: OTC contract address not configured",
      filteredOut: 0,
      nextCursor,
    };
  }

  const onchain = await readOrders(orders.map((o) => o.orderId).filter(Boolean));
  const nowSec = Math.floor(Date.now() / 1000);
  const checked = orders.map((o) => ({ ...o, ...verify(o, onchain.get(o.orderId), nowSec) }));
  const valid = checked.filter((o) => o.verified);

  return {
    orders: valid,
    verification: "arc",
    filteredOut: checked.length - valid.length,
    nextCursor,
  };
}
