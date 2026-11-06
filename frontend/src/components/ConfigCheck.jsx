import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { settings } from "../config/env.js";
import { shortAddress } from "../lib/format.js";

// Settings that exist on both sides and must agree, as [label, frontend value, backend value, frontend var, backend var].
function sharedSettings(backend) {
  return [
    ["OTC contract", settings.arc.otc, backend.arc?.contracts?.otc, "VITE_OTC_CONTRACT_ARC_TESTNET", "OTC_CONTRACT"],
    ["Premarket contract", settings.arc.premarket, backend.arc?.contracts?.premarket, "VITE_PREMARKET_CONTRACT_ARC_TESTNET", "PREMARKET_CONTRACT"],
    ["Token-list admin", settings.arkiv.adminAddress, backend.arkiv?.adminAddress, "VITE_ARKIV_ADMIN_ADDRESS", "ARKIV_ADMIN_ADDRESS"],
    ["ENS parent name", settings.ens.parentName, backend.ens?.parentName, "VITE_ENS_PARENT_NAME", "ENS_PARENT_NAME"],
  ];
}

// Backend feature flags (from /v1/config) and the BACKEND_ENV_FILE variables each one needs.
const FEATURES = {
  arkiv: ["Arkiv access key", "ARKIV_ACCESS_KEY"],
  adminAuth: ["Admin login", "AUTH_SECRET + ADMIN_WALLETS"],
  prices: ["Token prices", "COINMARKETCAP_API_KEY"],
  otc: ["OTC verification", "OTC_CONTRACT"],
  premarket: ["Premarket contract", "PREMARKET_CONTRACT"],
  keeper: ["Keeper (auto refunds)", "KEEPER_ENABLED=true + PLATFORM_PRIVATE_KEY"],
  ens: ["ENS names", "SEPOLIA_RPC_URL + ENS_USER_REGISTRY"],
  ensAdmin: ["ENS admin", "ENS + PLATFORM_PRIVATE_KEY"],
};

const show = (v) => (!v ? "not set" : /^0x[a-fA-F0-9]{40}$/.test(v) ? shortAddress(v) : v);
const same = (a, b) => (a || "").toLowerCase() === (b || "").toLowerCase();

function Dot({ tone }) {
  const color = { ok: "bg-accent", warn: "bg-warn", bad: "bg-sell", off: "bg-line" }[tone];
  return <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} aria-hidden />;
}

/**
 * Compares the frontend's settings (Vercel env) with the backend's (/v1/config,
 * from BACKEND_ENV_FILE) and lists which backend features are on. Public data
 * only, so it is shown before sign-in.
 */
export function ConfigCheck() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["backend-config"],
    queryFn: () => api.get("/config"),
    staleTime: 60_000,
  });

  return (
    <section className="mb-6 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold">Configuration check</h2>
      <p className="mt-1 text-sm text-muted">
        Frontend (Vercel environment variables) vs backend (<code>BACKEND_ENV_FILE</code>). After changing either side,
        redeploy it.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted">Reading the backend…</p>
      ) : error ? (
        <p className="mt-4 flex gap-2 text-sm text-sell">
          <Dot tone="bad" />
          Backend not reachable at {settings.apiBaseUrl}. Check VITE_BASE_URL, and that the backend&apos;s CORS_ORIGINS
          includes {window.location.origin}.
        </p>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Must match on both sides</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {sharedSettings(data).map(([label, front, back, frontVar, backVar]) => {
                const tone = !front && !back ? "off" : same(front, back) ? "ok" : "bad";
                return (
                  <li key={label} className="flex gap-2">
                    <Dot tone={tone} />
                    <span>
                      <span className="font-medium">{label}</span>{" "}
                      {tone === "ok" && <span className="text-muted">{show(front)}</span>}
                      {tone === "off" && <span className="text-muted">not set yet</span>}
                      {tone === "bad" && (
                        <span className="text-sell">
                          mismatch: frontend {show(front)} ({frontVar}) · backend {show(back)} ({backVar})
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Backend features</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {Object.entries(FEATURES).map(([key, [label, needs]]) => {
                const on = Boolean(data.features?.[key]);
                return (
                  <li key={key} className="flex gap-2">
                    <Dot tone={on ? "ok" : "off"} />
                    <span>
                      <span className="font-medium">{label}</span>{" "}
                      <span className="text-muted">{on ? "on" : `off · needs ${needs}`}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {!settings.walletConnectProjectId && (
              <p className="mt-3 flex gap-2 text-sm text-warn">
                <Dot tone="warn" />
                VITE_WALLETCONNECT_PROJECT_ID is not set: mobile wallets won&apos;t connect.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
