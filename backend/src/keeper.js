// Keeper: automatic settlement after deadlines (docs/PLAN.md §9).
//
// Arkiv listings disappear at their deadline, so the keeper remembers each
// order's deadline while the listing is still live. After the deadline it
// reads the order on Arc and calls the permissionless expire(orderId), which
// refunds the unfilled amount to the maker.
//
// Premarket claimDefault() will be added here once the PremarketMarket ABI
// is shared (docs/CONTRACT_INTERFACE.md).
import { asc, gt } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk/schema";
import { arkivPublic, arcPublic, arcWallet } from "./chains.js";
import { OtcOrder } from "./arkiv/schemas.js";
import { OTC_ABI, needsExpiry, readOrders } from "./contracts/otc.js";
import { config, features } from "./config.js";

const MAX_PAGES = 10; // up to 1000 live listings per refresh
const MAX_ATTEMPTS = 3;

// orderId -> { deadline, attempts }
const tracked = new Map();

async function refreshFromArkiv() {
  let lastKey;
  for (let page = 0; page < MAX_PAGES; page++) {
    let q = arkivPublic.select({ $key: true, orderId: true, deadline: true }).from(OtcOrder);
    if (lastKey) q = q.where(gt("$key", key(lastKey)));
    const { entities } = await q.orderBy(asc("$key")).limit(100).fetch();
    for (const e of entities) {
      const id = e.orderId.value.toString();
      if (!tracked.has(id)) tracked.set(id, { deadline: Number(e.deadline.value), attempts: 0 });
    }
    if (entities.length < 100) break;
    lastKey = entities.at(-1).$key;
  }
}

async function expireDueOrders() {
  const nowSec = Math.floor(Date.now() / 1000);
  const due = [...tracked].filter(([, t]) => t.deadline <= nowSec).map(([id]) => id);
  if (due.length === 0) return;

  const onchain = await readOrders(due);
  for (const id of due) {
    const order = onchain.get(id);
    if (!needsExpiry(order, nowSec)) {
      tracked.delete(id); // cancelled, filled or already refunded
      continue;
    }
    const entry = tracked.get(id);
    try {
      const { request } = await arcPublic.simulateContract({
        account: arcWallet.account,
        address: config.arc.contracts.otc,
        abi: OTC_ABI,
        functionName: "expire",
        args: [BigInt(id)],
      });
      const hash = await arcWallet.writeContract(request);
      await arcPublic.waitForTransactionReceipt({ hash });
      console.log(`[keeper] expired order ${id}: ${hash}`);
      tracked.delete(id);
    } catch (err) {
      entry.attempts += 1;
      console.warn(`[keeper] expire(${id}) failed (${entry.attempts}/${MAX_ATTEMPTS}): ${err.shortMessage || err.message}`);
      if (entry.attempts >= MAX_ATTEMPTS) tracked.delete(id);
    }
  }
}

let running = false;
async function tick() {
  if (running) return; // never overlap ticks
  running = true;
  try {
    await refreshFromArkiv();
    await expireDueOrders();
  } catch (err) {
    console.warn(`[keeper] tick failed: ${err.shortMessage || err.message}`);
  } finally {
    running = false;
  }
}

export function startKeeper() {
  if (!features.keeper || !features.otc) {
    console.log("[keeper] off (needs KEEPER_ENABLED=true, PLATFORM_PRIVATE_KEY and OTC_CONTRACT)");
    return () => {};
  }
  console.log(`[keeper] on, every ${config.keeper.intervalMs / 1000}s, account ${arcWallet.account.address}`);
  tick();
  const timer = setInterval(tick, config.keeper.intervalMs);
  return () => clearInterval(timer);
}

export function keeperStatus() {
  return { enabled: features.keeper && features.otc, trackedOrders: tracked.size };
}
