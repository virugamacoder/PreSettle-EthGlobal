import { useAccount, useSwitchChain } from "wagmi";
import { arcTestnet } from "../config/wagmi.js";

// Trading happens on Arc Testnet. Arkiv and Sepolia are only used for
// specific signatures, so we nudge the user back to Arc otherwise.
export function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === arcTestnet.id) return null;

  return (
    <div className="border-b border-warn/40 bg-warn/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2 text-sm">
        <span>Trading happens on <strong>Arc Testnet</strong>. Your wallet is on another network.</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => switchChain({ chainId: arcTestnet.id })}
          className="rounded-md bg-warn px-3 py-1 text-xs font-semibold text-black disabled:opacity-60"
        >
          {isPending ? "Switching…" : "Switch to Arc"}
        </button>
      </div>
    </div>
  );
}
