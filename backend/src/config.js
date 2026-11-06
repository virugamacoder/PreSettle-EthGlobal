import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const address = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed 20-byte address");
const privateKey = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "must be a 0x-prefixed 32-byte private key");
const csv = (item) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []))
    .pipe(z.array(item));
// Treat empty strings in .env as "not set".
const optional = (schema) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  BASE_URL: optional(z.string().url()),
  CORS_ORIGINS: csv(z.string().url()),

  // Arc Testnet: contracts and USDC settlement
  ARC_RPC_URL: z.string().url().default("https://rpc.testnet.arc.io"),
  OTC_CONTRACT: optional(address),
  PREMARKET_CONTRACT: optional(address),
  BROKER_REGISTRY: optional(address),

  // Arkiv: order book
  ARKIV_ACCESS_KEY: optional(z.string()),
  ARKIV_ADMIN_ADDRESS: optional(address),

  // Sepolia: ENSv2 broker names
  SEPOLIA_RPC_URL: optional(z.string().url()),
  ENS_PARENT_NAME: z.string().default("presettle.eth"),
  ENS_USER_REGISTRY: optional(address),

  // Platform account (keeper, ENS admin). Testnet-only key.
  PLATFORM_PRIVATE_KEY: optional(privateKey),
  ADMIN_WALLETS: csv(address),
  // Signs admin session tokens after Sign-In with Ethereum (min 32 chars).
  AUTH_SECRET: optional(z.string().min(32, "must be at least 32 characters")),
  // Domain the frontend uses in the SIWE message (e.g. pre-settle.vercel.app)
  SIWE_DOMAIN: optional(z.string()),

  // Keeper (automatic settlement after deadlines)
  KEEPER_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  KEEPER_INTERVAL_MS: z.coerce.number().int().min(5_000).default(30_000),

  // Token prices
  COINMARKETCAP_API_KEY: optional(z.string()),

  // Writable folder for view counts and uploaded images (a Docker volume in production)
  DATA_DIR: z.string().default("./data"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  console.error(`Invalid environment configuration:\n${lines.join("\n")}`);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  baseUrl: env.BASE_URL,
  corsOrigins: env.CORS_ORIGINS,
  arc: {
    chainId: 5042002,
    rpcUrl: env.ARC_RPC_URL,
    usdc: "0x3600000000000000000000000000000000000000",
    eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    contracts: {
      otc: env.OTC_CONTRACT ?? null,
      premarket: env.PREMARKET_CONTRACT ?? null,
      brokerRegistry: env.BROKER_REGISTRY ?? null,
    },
  },
  arkiv: {
    accessKey: env.ARKIV_ACCESS_KEY,
    adminAddress: env.ARKIV_ADMIN_ADDRESS,
  },
  ens: {
    rpcUrl: env.SEPOLIA_RPC_URL,
    parentName: env.ENS_PARENT_NAME,
    userRegistry: env.ENS_USER_REGISTRY,
  },
  platformPrivateKey: env.PLATFORM_PRIVATE_KEY,
  adminWallets: env.ADMIN_WALLETS.map((a) => a.toLowerCase()),
  auth: { secret: env.AUTH_SECRET, siweDomain: env.SIWE_DOMAIN },
  keeper: { enabled: env.KEEPER_ENABLED, intervalMs: env.KEEPER_INTERVAL_MS },
  prices: { coinMarketCapKey: env.COINMARKETCAP_API_KEY },
  dataDir: path.resolve(env.DATA_DIR),
};

// Which features can run with the current configuration.
export const features = {
  otc: Boolean(config.arc.contracts.otc),
  premarket: Boolean(config.arc.contracts.premarket),
  arkiv: Boolean(config.arkiv.accessKey),
  ens: Boolean(config.ens.rpcUrl && config.ens.userRegistry),
  ensAdmin: Boolean(config.ens.rpcUrl && config.ens.userRegistry && config.platformPrivateKey),
  keeper: Boolean(config.keeper.enabled && config.platformPrivateKey),
  adminAuth: Boolean(config.auth.secret && config.adminWallets.length),
  prices: Boolean(config.prices.coinMarketCapKey),
};

export function logFeatures() {
  const off = Object.entries(features).filter(([, on]) => !on).map(([name]) => name);
  const on = Object.entries(features).filter(([, on]) => on).map(([name]) => name);
  console.log(`features on:  ${on.join(", ") || "none"}`);
  if (off.length) console.log(`features off: ${off.join(", ")} (missing configuration)`);
}
