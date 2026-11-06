import { useState } from "react";
import { erc20Abi, isAddress, zeroAddress } from "viem";
import { useAccount, useConfig, useReadContracts } from "wagmi";
import { readContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { ExpirationTime } from "@arkiv-network/sdk";
import { addr, u64 } from "@arkiv-network/sdk/schema";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { WalletButton } from "../components/Header.jsx";
import { BrokerBadge } from "../components/BrokerBadge.jsx";
import { ConfigCheck } from "../components/ConfigCheck.jsx";
import { TokenAvatar } from "../components/TokenBanners.jsx";
import { useTokens } from "../hooks/useTokens.js";
import { OTC_ABI } from "../contracts/otc.js";
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
import { arcExplorer, shortAddress } from "../lib/format.js";
import { switchAndWait } from "../lib/chain.js";

const field = "rounded-md border border-line bg-page px-3 py-2 text-sm text-ink";
const btn = "rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50";

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

// Paused with the broker feature (not rendered; see the Admin page below).
// eslint-disable-next-line no-unused-vars
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
        <button onClick={renew} disabled={busy || !clean} className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50">Renew by {days || 0} days</button>
        <button onClick={revoke} disabled={busy || !clean} className="rounded-md border border-sell/50 px-4 py-2 text-sm text-sell disabled:opacity-50">Revoke</button>
      </div>
      <Status value={status} />
    </Section>
  );
}

/** Sends one owner transaction on Arc and reports the result. */
function useArcSend(onDone) {
  const config = useConfig();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  async function send(address, abi, functionName, args, doneText) {
    setBusy(true);
    setStatus(null);
    try {
      await switchAndWait(config, arcTestnet.id);
      const hash = await writeContract(config, { chainId: arcTestnet.id, address, abi, functionName, args });
      await waitForTransactionReceipt(config, { chainId: arcTestnet.id, hash });
      setStatus({ ok: true, text: `${doneText} (${arcExplorer.tx(hash)})` });
      onDone?.();
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }
  return { send, status, busy };
}

const FEE_CONTRACTS = [
  { name: "OTC market", address: settings.arc.otc, abi: OTC_ABI, note: "taken from each fill, in the payment token" },
  { name: "Premarket market", address: settings.arc.premarket, abi: PREMARKET_ABI, note: "taken from the buyers' payments at delivery" },
].filter((c) => c.address);

/** Platform fee per contract (the old "Commissions"). Owner only, max 100 bps = 1%. */
function PlatformFees() {
  const [input, setInput] = useState({});
  const fees = useReadContracts({
    contracts: FEE_CONTRACTS.flatMap((c) => [
      { chainId: arcTestnet.id, address: c.address, abi: c.abi, functionName: "platformFeeBps" },
      { chainId: arcTestnet.id, address: c.address, abi: c.abi, functionName: "owner" },
    ]),
    query: { enabled: FEE_CONTRACTS.length > 0 },
  });
  const { send, status, busy } = useArcSend(() => fees.refetch());
  if (!FEE_CONTRACTS.length) return null;

  return (
    <Section
      title="Platform fees"
      description="Fee in basis points (100 bps = 1%, the maximum). It applies to orders and offers created after the change; existing ones keep the fee they started with. Fees are credited to the owner's Balances."
    >
      <ul className="flex flex-col gap-3">
        {FEE_CONTRACTS.map((c, i) => {
          const bps = fees.data?.[i * 2]?.result;
          const owner = fees.data?.[i * 2 + 1]?.result;
          const value = input[c.name] ?? "";
          const valid = /^\d+$/.test(value) && Number(value) <= 100;
          return (
            <li key={c.name} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-40 font-medium">{c.name}</span>
              <span className="num w-32">{bps === undefined ? "…" : `${bps} bps (${Number(bps) / 100}%)`}</span>
              <span className="text-xs text-muted">{c.note}</span>
              <span className="ml-auto flex items-center gap-2">
                <input
                  value={value}
                  onChange={(e) => setInput((s) => ({ ...s, [c.name]: e.target.value.trim() }))}
                  placeholder="new bps (0–100)"
                  inputMode="numeric"
                  className={`${field} num w-36 py-1`}
                />
                <button
                  onClick={() => send(c.address, c.abi, "setPlatformFee", [Number(value)], `${c.name} fee set to ${value} bps`)}
                  disabled={busy || !valid}
                  className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-50"
                >
                  Save
                </button>
              </span>
              {owner && <span className="w-full text-xs text-muted">Owner: {shortAddress(owner)} (only this wallet can change it)</span>}
            </li>
          );
        })}
      </ul>
      <Status value={status} />
    </Section>
  );
}

/** Publishes (or replaces) a premarket token's logo: a kind "premarket" token-list entry keyed by symbol. */
async function publishPremarketLogo(config, sessionToken, symbol, file) {
  const { url } = await api.upload("/admin/uploads", file, sessionToken);
  const arkiv = await getArkivWallet(config);
  await arkiv.createEntity(
    Token,
    { kind: "premarket", address: addr(zeroAddress), symbol, name: symbol, decimals: u64(18n), logo: url },
    { expiration: ExpirationTime.max() },
  );
  await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
}

function MarketRow({ m, sessionToken, logo, send, busy, onLogo }) {
  const config = useConfig();
  const [realToken, setRealToken] = useState("");
  const [newTge, setNewTge] = useState("");
  const [file, setFile] = useState(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoStatus, setLogoStatus] = useState(null);
  const phase = marketPhase(m);
  const newTgeSec = newTge ? Math.floor(new Date(newTge).getTime() / 1000) : 0;
  const pm = settings.arc.premarket;

  async function saveLogo() {
    setLogoBusy(true);
    setLogoStatus(null);
    try {
      await publishPremarketLogo(config, sessionToken, m.symbol, file);
      setLogoStatus({ ok: true, text: "Logo published" });
      setFile(null);
      onLogo();
    } catch (err) {
      setLogoStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <TokenAvatar symbol={m.symbol} logo={logo} size="h-8 w-8" text="text-xs" />
        <span className="font-medium">#{m.id} {m.symbol}</span>
        <span className="text-muted">
          TGE {new Date(Number(m.tge) * 1000).toLocaleString()} · window {Math.round(Number(m.deliveryWindow) / 60)} min · {PHASE_LABEL[phase] ?? phase}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${m.active ? "bg-accent-soft text-accent" : "bg-warn/15 text-warn"}`}>
          {m.active ? "active" : "paused"}
        </span>
        <button
          onClick={() => send(pm, PREMARKET_ABI, "setMarketActive", [BigInt(m.id), !m.active], `${m.symbol} ${m.active ? "paused" : "resumed"}`)}
          disabled={busy}
          className="ml-auto rounded-full border border-line px-3 py-1 text-xs disabled:opacity-50"
        >
          {m.active ? "Pause" : "Resume"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-11">
        {/* Real token: only during the delivery window */}
        {Number(m.realToken) === 0 ? (
          <>
            <input value={realToken} onChange={(e) => setRealToken(e.target.value.trim())} placeholder="real token 0x…" className={`${field} num w-56 py-1`} />
            <button
              onClick={() => send(pm, PREMARKET_ABI, "setRealToken", [BigInt(m.id), realToken], `Real token set for ${m.symbol}`)}
              disabled={busy || !isAddress(realToken)}
              title="Works only between TGE and the end of the delivery window"
              className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-50"
            >
              Set token
            </button>
          </>
        ) : (
          <span className="num text-xs text-muted">real token {shortAddress(m.realToken)}</span>
        )}

        {/* Move TGE: only before TGE and only while the market has no offers */}
        {phase === "pre-tge" && (
          <>
            <input type="datetime-local" value={newTge} onChange={(e) => setNewTge(e.target.value)} className={`${field} py-1`} aria-label={`New TGE for ${m.symbol}`} />
            <button
              onClick={() => send(pm, PREMARKET_ABI, "setTge", [BigInt(m.id), BigInt(newTgeSec)], `${m.symbol} TGE moved`)}
              disabled={busy || newTgeSec <= Date.now() / 1000}
              className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-50"
            >
              Move TGE
            </button>
          </>
        )}

        {/* Logo shown on the Premarket banners and deal cards */}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" aria-label={`Logo for ${m.symbol}`} />
        <button onClick={saveLogo} disabled={logoBusy || !file || !sessionToken} className="rounded-full border border-line px-3 py-1 text-xs disabled:opacity-50">
          {logoBusy ? "Publishing…" : logo ? "Replace logo" : "Add logo"}
        </button>
      </div>
      {logoStatus && <p className={`pl-11 text-xs ${logoStatus.ok ? "text-accent" : "text-sell"}`}>{logoStatus.text}</p>}
    </li>
  );
}

const PHASE_LABEL = { "pre-tge": "before TGE (offers + buying)", delivery: "delivery window", settled: "after the window" };

function Markets({ token: sessionToken }) {
  const { markets, refetch } = useMarkets();
  const { premarketLogos, refetch: refetchTokens } = useTokens();
  const [symbol, setSymbol] = useState("");
  const [tge, setTge] = useState("");
  const [windowMin, setWindowMin] = useState("10");
  const { send, status, busy } = useArcSend(() => refetch());

  if (!settings.arc.premarket) return <Section title="Premarket markets"><EmptyState title="Premarket contract not configured" /></Section>;

  const tgeSec = tge ? Math.floor(new Date(tge).getTime() / 1000) : 0;
  return (
    <Section
      title="Premarket markets"
      description="One market per pre-launch token: its symbol, TGE time and delivery window. Sellers can list and buyers can buy until TGE; after TGE set the real token so sellers can deliver."
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.trim().toUpperCase())} placeholder="Symbol (XYZ)" className={field} />
        <input type="datetime-local" value={tge} onChange={(e) => setTge(e.target.value)} className={field} aria-label="TGE time" />
        <input value={windowMin} onChange={(e) => setWindowMin(e.target.value.trim())} placeholder="Delivery window (min)" className={`${field} num`} />
        <button
          onClick={() => send(settings.arc.premarket, PREMARKET_ABI, "createMarket", [symbol, BigInt(tgeSec), BigInt(Number(windowMin) * 60)], `Market ${symbol} created`)}
          disabled={busy || !symbol || tgeSec <= Date.now() / 1000 || !(Number(windowMin) > 0)}
          className={btn}
        >
          Create market
        </button>
      </div>
      {markets.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {markets.map((m) => (
            <MarketRow
              key={m.id}
              m={m}
              sessionToken={sessionToken}
              logo={premarketLogos[m.symbol.toUpperCase()]}
              send={send}
              busy={busy}
              onLogo={() => refetchTokens()}
            />
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
  const [cmcId, setCmcId] = useState("");
  const { address } = useAccount();
  const { listed, refetch } = useTokens();
  const [token, setToken] = useState("");
  const [kind, setKind] = useState("otc");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const isListAdmin = settings.arkiv.adminAddress && address?.toLowerCase() === settings.arkiv.adminAddress.toLowerCase();

  async function publish() {
    setBusy(true);
    setStatus(null);
    try {
      // Token details are read from Arc through the public RPC: no wallet switch needed here.
      const read = (functionName) => readContract(config, { chainId: arcTestnet.id, address: token, abi: erc20Abi, functionName });
      const [symbol, name, decimals] = await Promise.all([read("symbol"), read("name"), read("decimals")]);
      // Optional logo: uploaded to the backend, its URL stored in the Arkiv entity.
      const logoUrl = logo ? (await api.upload("/admin/uploads", logo, sessionToken)).url : null;
      const arkiv = await getArkivWallet(config);
      const { entityKey } = await arkiv.createEntity(
        Token,
        { kind, address: addr(token), symbol, name: name.slice(0, 120), decimals: u64(BigInt(decimals)), ...(logoUrl ? { logo: logoUrl } : {}), ...(/^\d+$/.test(cmcId) ? { cmcId: u64(BigInt(cmcId)) } : {}) },
        { expiration: ExpirationTime.max() },
      );
      setStatus({ ok: true, text: `${symbol} published to the token list (${arkivExplorer.entity(entityKey)})` });
      setToken("");
      refetch();
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry) {
    setBusy(true);
    setStatus(null);
    try {
      const arkiv = await getArkivWallet(config);
      await arkiv.deleteEntity({ entityKey: entry.key });
      setStatus({ ok: true, text: `${entry.symbol} removed from the token list` });
      refetch();
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="Token list (Arkiv)"
      description="Tokens users can pick. OTC token = what is traded (e.g. XYZ); Collateral = what it is priced and paid in (USDC and EURC are built in). Entries are Arkiv entities written by the list admin wallet; the app reads them with createdBy(admin)."
    >
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
        CoinMarketCap ID (optional, for the reference price)
        <input value={cmcId} onChange={(e) => setCmcId(e.target.value.trim())} placeholder="e.g. 1027" inputMode="numeric" className={`${field} num w-32 py-1`} />
      </label>
      <label className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
        Logo (optional, PNG/JPEG/WebP/GIF, max 512 KB)
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className="text-xs" />
        {logo && <img src={URL.createObjectURL(logo)} alt="" className="h-8 w-8 rounded-full object-cover" />}
      </label>
      <Status value={status} />

      <h3 className="mb-2 mt-6 text-sm font-semibold">Published ({listed.length})</h3>
      {listed.length === 0 ? (
        <p className="text-sm text-muted">Nothing published yet. USDC and EURC are always available.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {listed.map((t) => (
            <li key={t.key} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <TokenAvatar symbol={t.symbol} logo={t.logo} size="h-7 w-7" text="text-[10px]" />
              <span className="font-medium">{t.symbol}</span>
              <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{t.kind === "otc" ? "OTC token" : t.kind === "premarket" ? "Premarket logo" : "Collateral"}</span>
              {t.kind !== "premarket" && <span className="num text-xs text-muted">{shortAddress(t.address)} · {t.decimals} dec</span>}
              {t.cmcId && <span className="text-xs text-muted">CMC {t.cmcId}</span>}
              <a href={arkivExplorer.entity(t.key)} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">Arkiv</a>
              <button onClick={() => remove(t)} disabled={busy || !isListAdmin} className="ml-auto rounded-full border border-sell/50 px-3 py-1 text-xs text-sell disabled:opacity-50">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export default function Admin() {
  const { isConnected } = useAccount();
  const { session, signIn, signOut, error, pending } = useAdminSession();

  return (
    <>
      <PageHeader title="Admin" description="Platform fees, premarket markets and the curated token list." />
      <ConfigCheck />
      {!isConnected ? (
        <EmptyState title="Connect an admin wallet"><div className="mt-4 flex justify-center"><WalletButton /></div></EmptyState>
      ) : !session ? (
        <EmptyState title="Sign in with Ethereum to manage the platform">
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
          <PlatformFees />
          <Markets token={session.token} />
          <TokenList token={session.token} />
          {/* Broker licenses (ENSv2) are paused with the broker feature; re-enable when ENS is set up.
          {session.admin && <BrokerLicenses token={session.token} />} */}
        </div>
      )}
    </>
  );
}
