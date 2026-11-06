import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { settings } from "../config/env.js";

/** "ravi.settlex.eth" -> "ravi"; also accepts a bare label. null if not under our parent name. */
export function brokerLabel(nameOrLabel) {
  if (!nameOrLabel) return null;
  const n = nameOrLabel.trim().toLowerCase();
  const suffix = `.${settings.ens.parentName}`;
  const label = n.endsWith(suffix) ? n.slice(0, -suffix.length) : n.includes(".") ? null : n;
  return label && /^[a-z0-9-]{3,32}$/.test(label) ? label : null;
}

export const brokerName = (label) => `${label}.${settings.ens.parentName}`;

/**
 * ENSv2 broker license from the backend (/v1/brokers/:label):
 * { name, status, expiresAt, address, licenseStatus, maxFeeBps, prefs, verified }
 */
export function useBrokerLicense(nameOrLabel) {
  const label = brokerLabel(nameOrLabel);
  return useQuery({
    queryKey: ["broker", label],
    enabled: Boolean(label),
    staleTime: 30_000,
    queryFn: () => api.get(`/brokers/${label}`),
  });
}

/** Verified AND the license resolves to the expected wallet. */
export function isLicensedFor(license, address) {
  return Boolean(
    license?.verified && address && license.address && license.address.toLowerCase() === address.toLowerCase(),
  );
}
