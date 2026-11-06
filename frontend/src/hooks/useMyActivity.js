import { useQuery } from "@tanstack/react-query";
import { asc } from "@arkiv-network/sdk/query";
import { arkivPublic } from "../arkiv/client.js";
import { Fill, OtcOrder } from "../arkiv/schemas.js";

const v = (row, col) => row[col]?.value ?? null;

/** Live OTC listings owned by this wallet (straight from Arkiv). */
export function useMyOrders(address) {
  return useQuery({
    queryKey: ["my-orders", address],
    enabled: Boolean(address),
    queryFn: async () => {
      const { entities } = await arkivPublic
        .select("*")
        .from(OtcOrder)
        .ownedBy(address)
        .orderBy(asc("$key"))
        .limit(100)
        .fetch();
      return entities.map((e) => ({
        key: e.$key,
        owner: e.$owner,
        maker: v(e, "maker"),
        side: v(e, "side"),
        offerToken: v(e, "offerToken"),
        wantToken: v(e, "wantToken"),
        price: v(e, "price"),
        amount: v(e, "amount"),
        partial: v(e, "partial"),
        orderId: v(e, "orderId")?.toString(),
        deadline: Number(v(e, "deadline")),
        makerEns: v(e, "makerEns"),
        brokerEns: v(e, "brokerEns"),
      }));
    },
  });
}

/** Fills this wallet took (read-only Arkiv records it created). */
export function useMyFills(address) {
  return useQuery({
    queryKey: ["my-fills", address],
    enabled: Boolean(address),
    queryFn: async () => {
      const { entities } = await arkivPublic
        .select("*")
        .from(Fill)
        .ownedBy(address)
        .orderBy(asc("$key"))
        .limit(100)
        .fetch();
      return entities.map((e) => ({
        key: e.$key,
        market: v(e, "market"),
        refId: v(e, "refId")?.toString(),
        orderKey: v(e, "orderKey"),
        maker: v(e, "maker"),
        amount: v(e, "amount"),
        price: v(e, "price"),
        arcTx: v(e, "arcTx"),
        createdAtBlock: e.$createdAt?.toString() ?? null,
      }));
    },
  });
}
