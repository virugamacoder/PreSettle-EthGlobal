import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

/** Records one view of a listing per browser tab and returns the total count. */
export function useRecordView(key) {
  const [views, setViews] = useState(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const seen = `presettle-viewed-${key}`;
    let already = false;
    try {
      already = sessionStorage.getItem(seen) === "1";
    } catch {
      /* storage unavailable: just count */
    }
    const req = already ? api.get("/views", { keys: key }).then((r) => r[key.toLowerCase()]) : api.post(`/views/${key}`).then((r) => r.views);
    req
      .then((n) => {
        if (cancelled) return;
        setViews(n ?? 0);
        try {
          sessionStorage.setItem(seen, "1");
        } catch {
          /* ignore */
        }
      })
      .catch(() => {}); // view counts are optional
    return () => {
      cancelled = true;
    };
  }, [key]);

  return views;
}

/** View counts for several listings: { [key]: count }. */
export function useViewCounts(keys) {
  const list = (keys ?? []).slice(0, 100);
  const { data } = useQuery({
    queryKey: ["views", list],
    enabled: list.length > 0,
    staleTime: 60_000,
    queryFn: () => api.get("/views", { keys: list.join(",") }),
  });
  return data ?? {};
}
