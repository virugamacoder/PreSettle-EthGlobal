import { useState } from "react";
import { erc20Abi, isAddress } from "viem";
import { useAccount, useConfig } from "wagmi";
import { readContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ExpirationTime } from "@arkiv-network/sdk";
import { addr, u64 } from "@arkiv-network/sdk/schema";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { BrokerBadge } from "../components/BrokerBadge.jsx";
import { errorMessage } from "../components/TxSteps.jsx";
import { useAdminSession } from "../hooks/useAdminSession.js";
import { useMarkets } from "../hooks/usePremarket.js";
import { brokerLabel, brokerName } from "../hooks/useBroker.js";
import { PREMARKET_ABI, marketPhase } from "../contracts/premarket.js";
import { Token } from "../arkiv/schemas.js";
import { getArkivWallet } from "../arkiv/wallet.js";
import { arkivExplorer } from "../arkiv/client.js";
import { arcTestnet } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { api } from "../lib/api.js";
import { arcExplorer, shortAddress, timeLeft } from "../lib/format.js";

const field = "rounded-md border border-line bg-page px-3 py-2 text-sm text-ink";
const btn = "rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50";

function Section({ title, description, children }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Status({ value }) {
  if (!value) return null;
  return <p className={`mt-3 text-sm ${value.ok ? "text-accent" : "text-sell"}`}>{value.text}</p>;
}

function BrokerLicenses({ token }) {
  const [label, setLabel] = useState("");
  const [wallet, setWallet] = useState("");
  const [days, setDays] = useState("30");
  const [maxFee, setMaxFee] = useState("200");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const clean = brokerLabel(label);

  async function act(fn) {
    setBusy(true);
    setStatus({ ok: true, text: "Sending Sepolia transactions…" });
    try {
      setStatus({ ok: true, text: await fn() });
    } catch (err) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const issue = () =>
    act(async () => {
      const r = await api.post("/admin/brokers", { label: clean, address: wallet, days: Number(days), maxFeeBps: Number(maxFee) }, token);
      return `Issued ${r.name} (resolver ${shortAddress(r.resolver)}), valid until ${new Date(r.expiresAt * 1000).toLocaleDateString()}`;
    });
  const renew = () =>
    act(async () => {
      const r = await api.post(`/admin/brokers/${clean}/renew`, { days: Number(days) }, token);
      return `Renewed ${r.name} until ${new Date(r.expiresAt * 1000).toLocaleDateString()}`;
    });
  const revoke = () =>
    act(async () => {
      const r = await api.post(`/admin/brokers/${clean}/revoke`, {}, token);
      return `Revoked ${r.name}`;
    });

  return (
    <Section
      title="Broker licenses (ENSv2)"
      description={`Issue <name>.${settings.ens.parentName}: non-transferable, expiring, revocable. The broker can edit only presettle.prefs.`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input value={label} onChange={(e) => setLabel(e.target.value.trim())} placeholder="label (e.g. ravi)" className={field} />
        <input value={wallet} onChange={(e) => setWallet(e.target.value.trim())} placeholder="broker wallet 0x…" className={`${field} num`} />
        <input value={days} onChange={(e) => setDays(e.target.value.trim())} placeholder="days" className={`${field} num`} />
        <input value={maxFee} onChange={(e) => setMaxFee(e.target.value.trim())} placeholder="max fee bps" className={`${field} num`} />
      </div>
      {clean && <div className="mt-3"><BrokerBadge name={brokerName(clean)} size="md" /></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={issue} disabled={busy || !clean || !isAddress(wallet)} className={btn}>Issue license</button>
        <button onClick={renew} disabled={busy || !clean} className="rounded-md border border-line px-4 py-2 text-sm disabled:opacity-50">Renew by {days || 0} days</button>
        <button onClick={revoke} disabled={busy || !clean} className="rounded-md border border-sell/50 px-4 py-2 text-sm text-sell disabled:opacity-50">Revoke</button>
      </div>
      <Status value={status} />
    </Section>
  );
}

function Markets() {
  const config = useConfig();
  const { markets, refetch } = useMarkets();
  const [symbol, setSymbol] = useState("");
  const [tge, setTge] = useState("");
  const [windowMin, setWindowMin] = useState("5");
  const [realToken, setRealToken] = useState({});
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!settings.arc.premarket) return <Section title="Premarket markets"><EmptyState title="Premarket contract not configured" /></Section>;

  async function send(functionName, args, done) {
    setBusy(true);
    setStatus(null);
    try {
      await switchChain(config, { chainId: arcTestnet.id });
      const hash = await writeContract(config, { chainId: arcTestnet.id, address: settings.arc.premarket, abi: PREMARKET_ABI, functionName, args });
      await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
      setStatus({ ok: true, text: `${done} (${arcExplorer.tx(hash)})` });
      refetch();
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const tgeSec = tge ? Math.floor(new Date(tge).getTime() / 1000) : 0;
  return (
    <Section title="Premarket markets" description="Create a pre-launch market (TGE time + delivery window) and set the real token once it exists.">
      <div className="grid gap-3 sm:grid-cols-4">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.trim().toUpperCase())} placeholder="Symbol (XYZ)" className={field} />
        <input type="datetime-local" value={tge} onChange={(e) => setTge(e.target.value)} className={field} aria-label="TGE time" />
        <input value={windowMin} onChange={(e) => setWindowMin(e.target.value.trim())} placeholder="Delivery window (min)" className={`${field} num`} />
        <button
          onClick={() => send("createMarket", [symbol, BigInt(tgeSec), BigInt(Number(windowMin) * 60)], `Market ${symbol} created`)}
          disabled={busy || !symbol || tgeSec <= Date.now() / 1000 || !(Number(windowMin) > 0)}
          className={btn}
        >
          Create market
        </button>
      </div>
      {markets.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {markets.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="font-medium">#{m.id} {m.symbol}</span>
              <span className="text-muted">TGE {new Date(Number(m.tge) * 1000).toLocaleString()} · {marketPhase(m)}</span>
              {Number(m.realToken) === 0 ? (
                <span className="ml-auto flex gap-2">
                  <input
                    value={realToken[m.id] ?? ""}
                    onChange={(e) => setRealToken((r) => ({ ...r, [m.id]: e.target.value.trim() }))}
                    placeholder="real token 0x…"
                    className={`${field} num w-56 py-1`}
                  />
                  <button
                    onClick={() => send("setRealToken", [BigInt(m.id), realToken[m.id]], `Real token set for ${m.symbol}`)}
                    disabled={busy || !isAddress(realToken[m.id] ?? "")}
                    className="rounded-md border border-line px-3 py-1 text-xs disabled:opacity-50"
                  >
                    Set token
                  </button>
                </span>
              ) : (
                <span className="num ml-auto text-xs text-muted">token {shortAddress(m.realToken)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <Status value={status} />
    </Section>
  );
}

function TokenList({ token: sessionToken }) {
  const config = useConfig();
  const [logo, setLogo] = useState(null);
  const { address } = useAccount();
  const [token, setToken] = useState("");
  const [kind, setKind] = useState("otc");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const isListAdmin = settings.arkiv.adminAddress && address?.toLowerCase() === settings.arkiv.adminAddress.toLowerCase();

  async function publish() {
    setBusy(true);
    setStatus(null);
    try {
      await switchChain(config, { chainId: arcTestnet.id });
      const read = (functionName) => readContract(config, { chainId: arcTestnet.id, address: token, abi: erc20Abi, functionName });
      const [symbol, name, decimals] = await Promise.all([read("symbol"), read("name"), read("decimals")]);
      // Optional logo: uploaded to the backend, its URL stored in the Arkiv entity.
      const logoUrl = logo ? (await api.upload("/admin/uploads", logo, sessionToken)).url : null;
      const arkiv = await getArkivWallet(config);
      const { entityKey } = await arkiv.createEntity(
        Token,
        { kind, address: addr(token), symbol, name: name.slice(0, 120), decimals: u64(BigInt(decimals)), ...(logoUrl ? { logo: logoUrl } : {}) },
        { expiration: ExpirationTime.max() },
      );
      setStatus({ ok: true, text: `${symbol} published to the token list (${arkivExplorer.entity(entityKey)})` });
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Token list (Arkiv)" description="Curated tokens are Arkiv entities written by the list admin wallet; the app reads them with createdBy(admin).">
      {!isListAdmin && <p className="mb-3 text-sm text-warn">Connect the list admin wallet ({settings.arkiv.adminAddress ? shortAddress(settings.arkiv.adminAddress) : "VITE_ARKIV_ADMIN_ADDRESS not set"}) to publish.</p>}
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
        <input value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="Token address on Arc 0x…" className={`${field} num`} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
          <option value="otc">OTC token</option>
          <option value="collateral">Collateral</option>
        </select>
        <button onClick={publish} disabled={busy || !isListAdmin || !isAddress(token)} className={btn}>Publish</button>
      </div>
      <label className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
        Logo (optional, PNG/JPEG/WebP/GIF, max 512 KB)
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className="text-xs" />
        {logo && <img src={URL.createObjectURL(logo)} alt="" className="h-8 w-8 rounded-full object-cover" />}
      </label>
      <Status value={status} />
    </Section>
  );
}

export default function Admin() {
  const { isConnected } = useAccount();
  const { session, signIn, signOut, error, pending } = useAdminSession();

  return (
    <>
      <PageHeader title="Admin" description="Broker licenses, premarket markets and the curated token list." />
      {!isConnected ? (
        <EmptyState title="Connect an admin wallet"><div className="mt-4 flex justify-center"><ConnectButton /></div></EmptyState>
      ) : !session ? (
        <EmptyState title="Sign in with Ethereum to manage broker licenses">
          <button onClick={signIn} disabled={pending} className={`${btn} mt-4`}>{pending ? "Check your wallet…" : "Sign in"}</button>
          {error && <p className="mt-3 text-sell">{error}</p>}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between text-sm">
            <span className={session.admin ? "text-accent" : "text-warn"}>
              Signed in as {shortAddress(session.address)} · {session.admin ? "admin" : "not an admin wallet"}
            </span>
            <button onClick={signOut} className="text-muted hover:text-ink">Sign out</button>
          </div>
          {session.admin && <BrokerLicenses token={session.token} />}
          <Markets />
          <TokenList token={session.token} />
        </div>
      )}
    </>
  );
}
