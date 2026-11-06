// Read-only view of the OTC market contract on Arc Testnet (plus expire() for the keeper).
//
// The ABI is generated from contracts/ on every `npx hardhat compile`
// (hardhat-abi-exporter), so it always matches the deployed contract.
import { createRequire } from "node:module";
import { arcPublic } from "../chains.js";
import { config } from "../config.js";

export const OTC_ABI = createRequire(import.meta.url)("./abi/OTCMarket.json");

/** An order the keeper should expire: past deadline, still open, something left to refund. */
export function needsExpiry(onchain, nowSec) {
  if (!onchain || onchain.error) return false;
  if (onchain.cancelled) return false;
  if (Number(onchain.deadline) > nowSec) return false;
  return onchain.offerAmount - onchain.filledOffer > 0n;
}

/**
 * Reads many orders in one multicall.
 * @returns Map orderId(string) -> order | { error }
 */
export async function readOrders(orderIds) {
  const address = config.arc.contracts.otc;
  if (!address || orderIds.length === 0) return new Map();

  const results = await arcPublic.multicall({
    contracts: orderIds.map((id) => ({
      address,
      abi: OTC_ABI,
      functionName: "getOrder",
      args: [BigInt(id)],
    })),
    allowFailure: true,
  });

  return new Map(
    orderIds.map((id, i) => [
      String(id),
      results[i].status === "success" ? results[i].result : { error: results[i].error?.shortMessage || "call failed" },
    ]),
  );
}
