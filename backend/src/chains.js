import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet, sepolia } from "viem/chains";
import { createPublicClient as createArkivPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { config } from "./config.js";

// ── Arc Testnet: contracts and USDC settlement ──────────────────────────────
export const arcPublic = createPublicClient({
  chain: arcTestnet,
  transport: http(config.arc.rpcUrl),
});

// ── Sepolia: ENSv2 broker names ─────────────────────────────────────────────
export const sepoliaPublic = config.ens.rpcUrl
  ? createPublicClient({ chain: sepolia, transport: http(config.ens.rpcUrl) })
  : null;

// ── Arkiv (Rabdi testnet): order book ───────────────────────────────────────
// The access key raises rate limits; without it the public endpoint is used.
export const arkivChain = rabdi({ accessKey: config.arkiv.accessKey ?? "" });
export const arkivPublic = createArkivPublicClient({
  chain: arkivChain,
  transport: http(),
});

// ── Platform account (keeper + ENS admin) ───────────────────────────────────
export const platformAccount = config.platformPrivateKey
  ? privateKeyToAccount(config.platformPrivateKey)
  : null;

export const arcWallet = platformAccount
  ? createWalletClient({ account: platformAccount, chain: arcTestnet, transport: http(config.arc.rpcUrl) })
  : null;

export const sepoliaWallet = platformAccount && config.ens.rpcUrl
  ? createWalletClient({ account: platformAccount, chain: sepolia, transport: http(config.ens.rpcUrl) })
  : null;

// Latest block per chain; a failure on one chain doesn't hide the others.
export async function chainStatus() {
  const check = async (name, client) => {
    if (!client) return [name, { ok: false, error: "not configured" }];
    try {
      const block = await client.getBlockNumber();
      return [name, { ok: true, block: block.toString() }];
    } catch (err) {
      return [name, { ok: false, error: err.shortMessage || err.message }];
    }
  };
  return Object.fromEntries(
    await Promise.all([
      check("arc", arcPublic),
      check("arkiv", arkivPublic),
      check("sepolia", sepoliaPublic),
    ]),
  );
}
