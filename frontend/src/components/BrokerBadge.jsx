import { isLicensedFor, useBrokerLicense } from "../hooks/useBroker.js";

/**
 * Live ENSv2 license check for a broker name.
 * Verified only if the name is REGISTERED, unexpired, settlex.status=active,
 * and (when `address` is given) resolves to that wallet.
 */
export function BrokerBadge({ name, address, size = "sm" }) {
  const { data, isLoading, error } = useBrokerLicense(name);
  const text = size === "sm" ? "text-xs" : "text-sm";

  if (!name) return null;
  if (isLoading) return <span className={`${text} text-muted`}>checking {name}…</span>;
  if (error) return <span className={`${text} text-warn`} title={error.message}>{name} · can't verify</span>;

  const ok = address ? isLicensedFor(data, address) : data?.verified;
  const reason = !data?.verified
    ? data?.status !== "REGISTERED" ? "license revoked or not issued" : data?.expiresAt * 1000 < Date.now() ? "license expired" : "license inactive"
    : "license address doesn't match the broker";

  return ok ? (
    <span className={`${text} text-accent`} title={`ENSv2 license valid until ${new Date(data.expiresAt * 1000).toLocaleDateString()}`}>
      ✓ {data.name}
    </span>
  ) : (
    <span className={`${text} text-sell`} title={reason}>✕ {name} ({reason})</span>
  );
}
