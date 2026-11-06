import { http } from "wagmi";
import { arcTestnet, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { rabdi } from "@arkiv-network/sdk/chains";
import { settings } from "./env.js";

// Arkiv chain for wallet writes. No access key here: the wallet stores this
// chain's RPC URL, and the key must never end up in a user's wallet.
export const arkivWalletChain = rabdi({ accessKey: "" });

// Arc Testnet first: it's the default chain (contracts + USDC settlement).
// Arkiv: users sign order-book writes. Sepolia: ENSv2 (broker prefs).
export const wagmiConfig = getDefaultConfig({
  appName: "Pre Settle",
  projectId: settings.walletConnectProjectId || "presettle-dev",
  chains: [arcTestnet, arkivWalletChain, sepolia],
  transports: {
    [arcTestnet.id]: http(settings.arc.rpcUrl),
    [arkivWalletChain.id]: http(),
    [sepolia.id]: http(settings.ens.rpcUrl),
  },
  pollingInterval: 15_000,
});

export { arcTestnet, sepolia };
