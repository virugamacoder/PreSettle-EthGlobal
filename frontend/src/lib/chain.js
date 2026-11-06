import { getAccount, switchChain } from "wagmi/actions";

const NAMES = { 5042002: "Arc Testnet", 7794095: "Arkiv Rabdi", 11155111: "Sepolia" };

/**
 * Switches the wallet to `chainId` and waits until the wallet itself reports
 * that chain before returning.
 *
 * wagmi's switchChain can resolve while the wallet (e.g. MetaMask) still
 * answers with the previous chain, especially right after another switch
 * (Arc -> Arkiv -> Arc in one flow). The next transaction then fails with
 * "The current chain of the connector (id: X) does not match the connection's
 * chain (id: Y)". Waiting for the connector to catch up avoids that race.
 */
export async function switchAndWait(config, chainId, timeoutMs = 20_000) {
  await switchChain(config, { chainId });
  const { connector } = getAccount(config);
  if (!connector?.getChainId) return;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await connector.getChainId()) === chainId) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Your wallet didn't switch to ${NAMES[chainId] ?? `chain ${chainId}`}. Switch it with the network button in the header, then try again.`);
}
