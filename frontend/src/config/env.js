// All VITE_* settings in one place. Values are public (bundled into the browser).
const env = import.meta.env;

const asAddress = (v) => (v && /^0x[a-fA-F0-9]{40}$/.test(v) ? v : null);

export const settings = {
  // Backend API base, including /v1 (e.g. https://13.207.134.130.nip.io/v1)
  apiBaseUrl: (env.VITE_BASE_URL || "http://localhost:3000/v1").replace(/\/$/, ""),
  walletConnectProjectId: env.VITE_WALLETCONNECT_PROJECT_ID || "",

  arc: {
    rpcUrl: env.VITE_ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.io",
    usdc: "0x3600000000000000000000000000000000000000", // ERC-20 interface, 6 decimals
    eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", // 6 decimals
    otc: asAddress(env.VITE_OTC_CONTRACT_ARC_TESTNET),
    premarket: asAddress(env.VITE_PREMARKET_CONTRACT_ARC_TESTNET),
  },

  arkiv: {
    // Lock this key to the site's origin in the Arkiv Hub.
    accessKey: env.VITE_ARKIV_ACCESS_KEY || "",
    adminAddress: asAddress(env.VITE_ARKIV_ADMIN_ADDRESS),
  },

  ens: {
    rpcUrl: env.VITE_SEPOLIA_RPC_URL || undefined,
    parentName: env.VITE_ENS_PARENT_NAME || "presettle.eth",
  },
};

if (!settings.walletConnectProjectId) {
  console.warn("VITE_WALLETCONNECT_PROJECT_ID is not set: WalletConnect (mobile) wallets won't work.");
}
