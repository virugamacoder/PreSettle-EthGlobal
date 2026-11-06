import { http } from "viem";
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { settings } from "../config/env.js";

// Read client: uses the site's access key (locked to our origin in the Arkiv Hub).
export const arkivReadChain = rabdi({ accessKey: settings.arkiv.accessKey });
export const arkivPublic = createPublicClient({ chain: arkivReadChain, transport: http() });

const EXPLORER = "https://rabdi.explorer.arkiv.network";
export const arkivExplorer = {
  entity: (key) => `${EXPLORER}/entity/${key}`,
  tx: (hash) => `${EXPLORER}/tx/${hash}`,
  address: (address) => `${EXPLORER}/address/${address}`,
};
