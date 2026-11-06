import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { NoEntityFoundError } from "@arkiv-network/sdk";
import { arkivPublic } from "../arkiv/client.js";
import { OtcOrder } from "../arkiv/schemas.js";
import { OTC_ABI } from "../contracts/otc.js";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";

/** One OTC listing from Arkiv by entity key. data = null when expired/deleted. */
export function useArkivOrder(key) {
  return useQuery({
    queryKey: ["arkiv-order", key],
    enabled: Boolean(key),
    queryFn: async () => {
      try {
        const e = await arkivPublic.getEntity(key, OtcOrder);
        return {
          key,
          owner: e.$owner,
          expiresAtBlock: e.$expiresAt,
          maker: e.maker.value,
          side: e.side.value,
          offerToken: e.offerToken.value,
          wantToken: e.wantToken.value,
          price: e.price.value,
          amount: e.amount.value,
          partial: e.partial.value,
          orderId: e.orderId.value,
          deadline: Number(e.deadline.value),
          broker: e.broker?.value ?? null,
          brokerEns: e.brokerEns?.value ?? null,
          makerEns: e.makerEns?.value ?? null,
          arcTx: e.arcTx.value,
        };
      } catch (err) {
        if (err instanceof NoEntityFoundError) return null;
        throw err;
      }
    },
  });
}

/** The order as stored in the Arc escrow contract. */
export function useOnchainOrder(orderId) {
  return useReadContract({
    chainId: arcTestnet.id,
    address: settings.arc.otc ?? undefined,
    abi: OTC_ABI,
    functionName: "getOrder",
    args: orderId !== undefined && orderId !== null ? [BigInt(orderId)] : undefined,
    query: { enabled: Boolean(settings.arc.otc) && orderId !== undefined && orderId !== null, refetchInterval: 20_000 },
  });
}
