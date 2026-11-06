import { http } from "viem";
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { settings } from "../config/env.js";

// Read client: uses the site's access key (locked to our origin in the Arkiv Hub).
// Without a key Arkiv answers 429 once a small per-IP budget is used, so fail
// fast (no retries: a 429 carries a long Retry-After) and show an error instead of hanging.
export const arkivReadChain = rabdi({ accessKey: settings.arkiv.accessKey });
export const arkivPublic = createPublicClient({
  chain: arkivReadChain,
  transport: http(undefined, { timeout: 15_000, retryCount: 0 }),
});

if (!settings.arkiv.accessKey) {
  console.warn("VITE_ARKIV_ACCESS_KEY is not set: Arkiv reads use the small anonymous budget and will hit 429.");
}

const EXPLORER = "https://rabdi.explorer.arkiv.network";
export const arkivExplorer = {
  entity: (key) => `${EXPLORER}/entity/${key}`,
  tx: (hash) => `${EXPLORER}/tx/${hash}`,
  address: (address) => `${EXPLORER}/address/${address}`,
};
