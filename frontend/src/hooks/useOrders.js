import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

/**
 * OTC orders from the backend (/v1/orders): read from Arkiv and verified on Arc.
 * Paginates with the cursor the backend returns.
 */
export function useOrders(filters) {
  return useInfiniteQuery({
    queryKey: ["orders", filters],
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => api.get("/orders", { ...filters, cursor: pageParam, limit: 25 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 30_000,
  });
}
