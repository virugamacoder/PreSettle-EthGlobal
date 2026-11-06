import { custom } from "viem";
import { createWalletClient } from "@arkiv-network/sdk";
import { getWalletClient, switchChain } from "wagmi/actions";
import { arkivWalletChain } from "../config/wagmi.js";

/**
 * Switches the connected wallet to Arkiv and returns an Arkiv wallet client
 * that signs with the user's own wallet (so the user owns the entity).
 * Built from wagmi's connection: the Arkiv docs say not to use window.ethereum.
 */
export async function getArkivWallet(wagmiConfig) {
  await switchChain(wagmiConfig, { chainId: arkivWalletChain.id });
  const wc = await getWalletClient(wagmiConfig, { chainId: arkivWalletChain.id });
  return createWalletClient({ chain: arkivWalletChain, transport: custom(wc.transport), account: wc.account });
}
