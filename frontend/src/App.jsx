import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

export default function App() {
  const { address, chain } = useAccount();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6 px-4">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">SettleX</p>
      <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
        Trustless OTC and pre-launch trading, settled in USDC on Arc.
      </h1>
      <p className="max-w-2xl text-lg text-muted">
        Escrowed deals on Arc, verified brokers on ENS, and an open order book on Arkiv.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <ConnectButton />
        {address && <span className="text-sm text-muted">Network: {chain?.name ?? "unsupported"}</span>}
      </div>
    </main>
  );
}
