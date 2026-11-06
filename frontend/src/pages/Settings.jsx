import { useState } from "react";
import { parseAbi, toHex } from "viem";
import { normalize, packetToBytes } from "viem/ens";
import { useAccount, useConfig, useEnsName } from "wagmi";
import { getPublicClient, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExpirationTime } from "@arkiv-network/sdk";
import { dec } from "@arkiv-network/sdk/schema";
import { PageHeader, EmptyState } from "../components/PageHeader.jsx";
import { BrokerBadge } from "../components/BrokerBadge.jsx";
import { errorMessage } from "../components/TxSteps.jsx";
import { useTheme } from "../hooks/useTheme.js";
import { brokerLabel, brokerName, isLicensedFor, useBrokerLicense } from "../hooks/useBroker.js";
import { Profile } from "../arkiv/schemas.js";
import { arkivPublic, arkivExplorer } from "../arkiv/client.js";
import { getArkivWallet } from "../arkiv/wallet.js";
import { arcTestnet, sepolia } from "../config/wagmi.js";
import { settings } from "../config/env.js";
import { isDecimal } from "../lib/amounts.js";
import { switchAndWait } from "../lib/chain.js";

const field = "rounded-md border border-line bg-page px-3 py-2 text-sm text-ink";
const btn = "rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50";
const RESOLVER_ABI = parseAbi(["function setText(bytes name, string key, string value)"]);

function Card({ title, description, children }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Appearance() {
  const { theme, setTheme } = useTheme();
  return (
    <Card title="Appearance">
      <div className="flex gap-2">
        {["dark", "light"].map((t) => (
          <button key={t} onClick={() => setTheme(t)} className={`rounded-md border px-4 py-2 text-sm capitalize ${theme === t ? "border-accent text-accent" : "border-line text-muted"}`}>
            {t}
          </button>
        ))}
      </div>
    </Card>
  );
}

function TraderProfile() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { data: ensName } = useEnsName({ address, chainId: sepolia.id });
  const existing = useQuery({
    queryKey: ["profile", address],
    enabled: Boolean(address),
    queryFn: async () => {
      const { entities } = await arkivPublic.select("*").from(Profile).ownedBy(address).limit(1).fetch();
      return entities[0] ?? null;
    },
  });
  const [prefTokens, setPrefTokens] = useState(null);
  const [minSize, setMinSize] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const current = existing.data;
  const tokensValue = prefTokens ?? current?.prefTokens?.value ?? "";
  const minValue = minSize ?? current?.minSize?.value ?? "";

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const values = {
        ens: ensName ?? "",
        prefTokens: tokensValue.slice(0, 120),
        ...(isDecimal(minValue) ? { minSize: dec(String(minValue)) } : {}),
      };
      const arkiv = await getArkivWallet(config);
      if (current) {
        // One transaction: update the fields and push the expiry out again.
        await arkiv.executeBatch({
          patches: [{ schema: Profile, entityKey: current.$key, set: values }],
          extensions: [{ entityKey: current.$key, expiration: ExpirationTime.fromDays(180) }],
        });
        setStatus({ ok: true, text: "Profile updated and extended for 180 days." });
      } else {
        const { entityKey } = await arkiv.createEntity(Profile, values, { expiration: ExpirationTime.fromDays(180) });
        setStatus({ ok: true, text: `Profile created: ${arkivExplorer.entity(entityKey)}` });
      }
      queryClient.invalidateQueries({ queryKey: ["profile", address] });
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Trader profile (Arkiv)" description="Your trading preferences as an Arkiv entity you own. Any app can read it; only you can change it. It stays for 180 days and is extended each time you save.">
      {existing.isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <input value={tokensValue} onChange={(e) => setPrefTokens(e.target.value)} placeholder="Preferred tokens, e.g. EURC, XYZ" className={field} />
          <input value={minValue} onChange={(e) => setMinSize(e.target.value.trim())} placeholder="Min deal size" className={`${field} num`} />
          <button onClick={save} disabled={busy} className={btn}>{busy ? "Confirm…" : current ? "Update" : "Create profile"}</button>
        </div>
      )}
      {ensName && <p className="mt-2 text-xs text-muted">Linked ENS name: {ensName}</p>}
      {status && <p className={`mt-3 text-sm ${status.ok ? "text-accent" : "text-sell"}`}>{status.text}</p>}
    </Card>
  );
}

function BrokerPrefs() {
  const config = useConfig();
  const { address } = useAccount();
  const [label, setLabel] = useState("");
  const [prefs, setPrefs] = useState('{"tokens":["EURC"],"minSize":1000}');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const clean = brokerLabel(label);
  const license = useBrokerLicense(clean);
  const licensed = isLicensedFor(license.data, address);

  // Writes a text record on the broker's own PermissionedResolver (Sepolia).
  async function setText(key, value, okText) {
    setBusy(true);
    setStatus(null);
    try {
      const name = normalize(brokerName(clean));
      await switchAndWait(config, sepolia.id);
      const client = getPublicClient(config, { chainId: sepolia.id });
      const resolver = await client.getEnsResolver({ name });
      const hash = await writeContract(config, {
        chainId: sepolia.id, address: resolver, abi: RESOLVER_ABI, functionName: "setText", args: [toHex(packetToBytes(name)), key, value],
      });
      await waitForTransactionReceipt(config, { chainId: sepolia.id, hash });
      setStatus({ ok: true, text: okText });
      license.refetch();
    } catch (err) {
      const msg = errorMessage(err);
      setStatus({
        ok: false,
        text: /EACUnauthorizedAccountRoles|unauthori/i.test(msg)
          ? `Rejected by ENSv2 access control: brokers can only set presettle.prefs. (${msg})`
          : msg,
      });
    } finally {
      setBusy(false);
      await switchChain(config, { chainId: arcTestnet.id }).catch(() => {});
    }
  }

  return (
    <Card title="Broker preferences (ENSv2)" description={`Brokers can edit only the presettle.prefs text record of their <name>.${settings.ens.parentName}; Pre Settle controls presettle.status and the address record.`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value.trim())} placeholder="your broker label" className={`${field} flex-1`} />
          <span className="text-sm text-muted">.{settings.ens.parentName}</span>
        </div>
        {clean && <BrokerBadge name={brokerName(clean)} address={address} size="md" />}
        {license.data?.prefs && <p className="num text-xs text-muted">Current presettle.prefs: {license.data.prefs}</p>}
        <textarea value={prefs} onChange={(e) => setPrefs(e.target.value)} rows={3} className={`${field} num`} />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setText("presettle.prefs", prefs, "presettle.prefs updated on ENS.")} disabled={busy || !licensed} className={btn}>
            Save prefs to ENS
          </button>
          <button
            onClick={() => setText("presettle.status", "active", "Unexpected: presettle.status was writable.")}
            disabled={busy || !licensed}
            className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50"
            title="Shows that ENSv2 access control blocks brokers from editing their license status"
          >
            Test permission: edit presettle.status
          </button>
        </div>
        {status && <p className={`text-sm ${status.ok ? "text-accent" : "text-sell"}`}>{status.text}</p>}
      </div>
    </Card>
  );
}

export default function Settings() {
  const { isConnected } = useAccount();
  return (
    <>
      <PageHeader title="Settings" description="Appearance, your Arkiv trader profile and broker preferences on ENS." />
      <div className="flex flex-col gap-6">
        <Appearance />
        {isConnected ? (
          <>
            <TraderProfile />
            <BrokerPrefs />
          </>
        ) : (
          <EmptyState title="Connect a wallet to edit your profile and broker preferences" />
        )}
      </div>
    </>
  );
}
