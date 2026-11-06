import { useCallback, useState } from "react";
import { useAccount, useConfig } from "wagmi";
import { signMessage } from "wagmi/actions";
import { createSiweMessage } from "viem/siwe";
import { api } from "../lib/api.js";

const KEY = "settlex-admin-session";

function load() {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return s && s.expires > Date.now() ? s : null;
  } catch {
    return null;
  }
}

/** Sign-In with Ethereum against the backend; the session token is kept for this tab only. */
export function useAdminSession() {
  const config = useConfig();
  const { address, chainId } = useAccount();
  const [session, setSession] = useState(load);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const active = session && address && session.address.toLowerCase() === address.toLowerCase() ? session : null;

  const signIn = useCallback(async () => {
    setError(null);
    setPending(true);
    try {
      const { nonce } = await api.get("/auth/nonce");
      const message = createSiweMessage({
        address,
        chainId,
        domain: window.location.host,
        uri: window.location.origin,
        nonce,
        version: "1",
        statement: "Sign in to SettleX admin.",
      });
      const signature = await signMessage(config, { message });
      const res = await api.post("/auth/verify", { message, signature });
      const next = { address: res.address, admin: res.admin, token: res.token, expires: Date.now() + 8 * 3600 * 1000 };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: session lasts until reload */
      }
      setSession(next);
    } catch (err) {
      setError(err.shortMessage || err.message);
    } finally {
      setPending(false);
    }
  }, [address, chainId, config]);

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setSession(null);
  }, []);

  return { session: active, signIn, signOut, error, pending };
}
