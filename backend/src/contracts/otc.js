// Read-only view of the OTC market contract on Arc Testnet.
//
// The ABI below is the interface the app EXPECTS (docs/CONTRACT_INTERFACE.md).
// When the contract developer shares the real ABI, replace OTC_ABI with it
// and adjust readOrders() if the struct fields differ.
import { parseAbi } from "viem";
import { arcPublic } from "../chains.js";
import { config } from "../config.js";

export const OTC_ABI = parseAbi([
  "struct Order { address maker; address offerToken; uint256 offerAmount; address wantToken; uint256 wantAmount; uint256 filledOffer; bool partialAllowed; uint64 deadline; address privateTaker; address broker; uint16 brokerFeeBps; bool cancelled; }",
  "function getOrder(uint256 orderId) view returns (Order)",
]);

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
