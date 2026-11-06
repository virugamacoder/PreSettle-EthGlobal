import { custom } from "viem";
import { createWalletClient } from "@arkiv-network/sdk";
import { getWalletClient } from "wagmi/actions";
import { switchAndWait } from "../lib/chain.js";
import { arkivWalletChain } from "../config/wagmi.js";

/**
 * Switches the connected wallet to Arkiv and returns an Arkiv wallet client
 * that signs with the user's own wallet (so the user owns the entity).
 * Built from wagmi's connection: the Arkiv docs say not to use window.ethereum.
 */
export async function getArkivWallet(wagmiConfig) {
  // If the wallet flips back to the previous chain right after switching,
  // wagmi throws ConnectorChainMismatchError ("The current chain of the
  // connector … does not match the connection's chain …"). Switch again and
  // retry instead of failing the step.
  for (let attempt = 1; ; attempt++) {
    await switchAndWait(wagmiConfig, arkivWalletChain.id);
    try {
      const wc = await getWalletClient(wagmiConfig, { chainId: arkivWalletChain.id });
      return createWalletClient({ chain: arkivWalletChain, transport: custom(wc.transport), account: wc.account });
    } catch (err) {
      const mismatch = err?.name === "ConnectorChainMismatchError" || /does not match the connection/i.test(err?.message ?? "");
      if (!mismatch || attempt >= 3) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
