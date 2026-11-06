// ENSv2 broker licenses on Sepolia (docs/PLAN.md §8).
//
// Each broker gets <label>.<ENS_PARENT_NAME> in our own UserRegistry:
// - registered with roleBitmap = 0  -> broker owns the token but can't transfer it
//   or change its resolver (non-transferable license)
// - absolute expiry                 -> expiring license, extended with renew()
// - unregister()                    -> revocation (name becomes AVAILABLE, token burned)
// Each broker name gets its own PermissionedResolver. SettleX keeps all roles,
// and the broker is granted the setter role for ONE text key: settlex.prefs.
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbi,
  parseEventLogs,
  stringToHex,
  toHex,
  zeroAddress,
} from "viem";
import { labelhash, normalize, packetToBytes } from "viem/ens";
import { sepoliaPublic, sepoliaWallet, platformAccount } from "../chains.js";
import { config } from "../config.js";
import { httpError } from "../auth.js";

// ENSv2 Sepolia deployments (docs.ens.domains/learn/deployments)
const VERIFIABLE_FACTORY = "0xda70306c98e97ece36f997a21368e53298572991";
const PERMISSIONED_RESOLVER_IMPL = "0x115eb53f0c60696633855f90b138178fb40b2b2c";

// Every role and its admin counterpart (docs: verifiable-factory example)
const ALL_ROLES = 0x1111111111111111111111111111111111111111111111111111111111111111n;
const STATUS = ["AVAILABLE", "RESERVED", "REGISTERED"];
const ETH_COIN_TYPE = 60n;
const PREFS_KEY = "settlex.prefs";

const REGISTRY_ABI = parseAbi([
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)",
  "function unregister(uint256 anyId)",
  "function renew(uint256 anyId, uint64 newExpiry)",
  "function getStatus(uint256 anyId) view returns (uint8)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
]);
const FACTORY_ABI = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);
const RESOLVER_ABI = parseAbi([
  "function initialize((address account, uint256 roleBitmap)[] grants, bytes[] calls)",
  "function setAddress(bytes name, uint256 coinType, bytes addressBytes)",
  "function setText(bytes name, string key, string value)",
  "function grantSetterRoles(bytes setter, address account)",
]);

export const LABEL_RE = /^[a-z0-9-]{3,32}$/;

export function brokerName(label) {
  return normalize(`${label}.${config.ens.parentName}`);
}

const anyId = (label) => BigInt(labelhash(label));
const dnsEncode = (name) => toHex(packetToBytes(name));

function requireRead() {
  if (!sepoliaPublic || !config.ens.userRegistry) throw httpError(503, "ENS is not configured");
}
function requireWrite() {
  requireRead();
  if (!sepoliaWallet) throw httpError(503, "ENS admin account is not configured");
}

async function send(request) {
  const hash = await sepoliaWallet.writeContract(request);
  const receipt = await sepoliaPublic.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw httpError(502, `Sepolia transaction reverted: ${hash}`);
  return receipt;
}

/** Public view of a broker license, used by the frontend badge and deal gate. */
export async function readBroker(label) {
  requireRead();
  const name = brokerName(label);
  const registry = config.ens.userRegistry;
  const [status, expiry] = await Promise.all([
    sepoliaPublic.readContract({ address: registry, abi: REGISTRY_ABI, functionName: "getStatus", args: [anyId(label)] }),
    sepoliaPublic.readContract({ address: registry, abi: REGISTRY_ABI, functionName: "getExpiry", args: [anyId(label)] }),
  ]);

  const registered = STATUS[status] === "REGISTERED";
  const [address, licenseStatus, prefs, maxFeeBps] = registered
    ? await Promise.all([
        sepoliaPublic.getEnsAddress({ name }).catch(() => null),
        sepoliaPublic.getEnsText({ name, key: "settlex.status" }).catch(() => null),
        sepoliaPublic.getEnsText({ name, key: PREFS_KEY }).catch(() => null),
        sepoliaPublic.getEnsText({ name, key: "settlex.maxFeeBps" }).catch(() => null),
      ])
    : [null, null, null, null];

  const expiresAt = Number(expiry);
  const verified = registered && expiresAt > Math.floor(Date.now() / 1000) && licenseStatus === "active" && Boolean(address);

  return {
    name,
    status: STATUS[status] ?? `UNKNOWN(${status})`,
    expiresAt,
    address,
    licenseStatus,
    maxFeeBps: maxFeeBps ? Number(maxFeeBps) : null,
    prefs,
    verified,
  };
}

/**
 * Issues a broker license:
 * 1. deploy a PermissionedResolver for this broker with its records,
 * 2. let the broker edit only settlex.prefs,
 * 3. register <label> in the SettleX UserRegistry with no roles and an expiry.
 */
export async function issueBroker({ label, address, days, maxFeeBps }) {
  requireWrite();
  const status = await sepoliaPublic.readContract({
    address: config.ens.userRegistry, abi: REGISTRY_ABI, functionName: "getStatus", args: [anyId(label)],
  });
  if (STATUS[status] !== "AVAILABLE") throw httpError(409, `${brokerName(label)} is ${STATUS[status]}`);

  const name = brokerName(label);
  const dnsName = dnsEncode(name);
  const platform = platformAccount.address;

  // 1. Resolver proxy. A fresh salt per issuance, so a revoked label can be issued again.
  const version = BigInt(keccak256(stringToHex(`${label}:${Date.now()}`)));
  const salt = BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
        [keccak256(stringToHex("OwnedResolver")), platform, version],
      ),
    ),
  );
  const initialRecords = [
    encodeFunctionData({ abi: RESOLVER_ABI, functionName: "setAddress", args: [dnsName, ETH_COIN_TYPE, address] }),
    encodeFunctionData({ abi: RESOLVER_ABI, functionName: "setText", args: [dnsName, "settlex.role", "broker"] }),
    encodeFunctionData({ abi: RESOLVER_ABI, functionName: "setText", args: [dnsName, "settlex.status", "active"] }),
    encodeFunctionData({ abi: RESOLVER_ABI, functionName: "setText", args: [dnsName, "settlex.maxFeeBps", String(maxFeeBps)] }),
  ];
  const initData = encodeFunctionData({
    abi: RESOLVER_ABI,
    functionName: "initialize",
    args: [[{ account: platform, roleBitmap: ALL_ROLES }], initialRecords],
  });
  const deployReceipt = await send({
    address: VERIFIABLE_FACTORY, abi: FACTORY_ABI, functionName: "deployProxy",
    args: [PERMISSIONED_RESOLVER_IMPL, salt, initData],
  });
  const [deployed] = parseEventLogs({ abi: FACTORY_ABI, eventName: "ProxyDeployed", logs: deployReceipt.logs });
  if (!deployed) throw httpError(502, "Resolver deployment emitted no ProxyDeployed event");
  const resolver = deployed.args.proxyAddress;

  // 2. Broker may set ONLY settlex.prefs (name/value in the setter are ignored).
  const setter = encodeFunctionData({ abi: RESOLVER_ABI, functionName: "setText", args: ["0x", PREFS_KEY, ""] });
  const grantReceipt = await send({
    address: resolver, abi: RESOLVER_ABI, functionName: "grantSetterRoles", args: [setter, address],
  });

  // 3. Register with roleBitmap = 0 (non-transferable) and an absolute expiry.
  const expiry = BigInt(Math.floor(Date.now() / 1000) + days * 86_400);
  const registerReceipt = await send({
    address: config.ens.userRegistry, abi: REGISTRY_ABI, functionName: "register",
    args: [label, address, zeroAddress, resolver, 0n, expiry],
  });

  return {
    name,
    resolver,
    expiresAt: Number(expiry),
    transactions: [deployReceipt.transactionHash, grantReceipt.transactionHash, registerReceipt.transactionHash],
  };
}

/** Revokes a license: the name becomes AVAILABLE and the token is burned. */
export async function revokeBroker(label) {
  requireWrite();
  const receipt = await send({
    address: config.ens.userRegistry, abi: REGISTRY_ABI, functionName: "unregister", args: [anyId(label)],
  });
  return { name: brokerName(label), transaction: receipt.transactionHash };
}

/** Extends a license by `days` from its current expiry (expiry can only grow). */
export async function renewBroker(label, days) {
  requireWrite();
  const current = await sepoliaPublic.readContract({
    address: config.ens.userRegistry, abi: REGISTRY_ABI, functionName: "getExpiry", args: [anyId(label)],
  });
  const base = BigInt(Math.max(Number(current), Math.floor(Date.now() / 1000)));
  const newExpiry = base + BigInt(days * 86_400);
  const receipt = await send({
    address: config.ens.userRegistry, abi: REGISTRY_ABI, functionName: "renew", args: [anyId(label), newExpiry],
  });
  return { name: brokerName(label), expiresAt: Number(newExpiry), transaction: receipt.transactionHash };
}
