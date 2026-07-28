"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const REF_KEY = "cfs_ref";
export const SESSION_EVENT = "cfs-session";

export function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && ref.length >= 32) {
    localStorage.setItem(REF_KEY, ref);
  }
}

export function getStoredReferrer(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REF_KEY);
}

export function notifyNavSession(wallet: string | null) {
  window.dispatchEvent(
    new CustomEvent(SESSION_EVENT, { detail: { wallet } }),
  );
}

type Props = {
  onAuthed: () => void;
  onLoggedOut: () => void;
};

/** Navbar session chip — no Select Wallet (connect lives in Sign in modal). */
export function ConnectAuth({ onAuthed, onLoggedOut }: Props) {
  const { disconnect } = useWallet();
  const [authedWallet, setAuthedWallet] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    captureReferralFromUrl();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/me");
        const json = await res.json();
        if (cancelled) return;
        if (json.ok && json.data?.wallet) {
          setAuthedWallet(String(json.data.wallet));
          onAuthed();
        }
      } catch {
        // no session
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const wallet = (e as CustomEvent<{ wallet: string | null }>).detail
        ?.wallet;
      if (wallet) {
        setAuthedWallet(wallet);
        onAuthed();
      } else {
        setAuthedWallet(null);
        onLoggedOut();
      }
    };
    window.addEventListener(SESSION_EVENT, handler);
    return () => window.removeEventListener(SESSION_EVENT, handler);
  }, [onAuthed, onLoggedOut]);

  const logout = useCallback(async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthedWallet(null);
    notifyNavSession(null);
    onLoggedOut();
    await disconnect();
  }, [disconnect, onLoggedOut]);

  if (!mounted || !authedWallet) return null;

  return (
    <div className="nav-session">
      <span className="nav-chip mono" title={authedWallet}>
        {authedWallet.slice(0, 4)}…{authedWallet.slice(-4)}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-nav"
        onClick={logout}
      >
        Log out
      </button>
    </div>
  );
}
