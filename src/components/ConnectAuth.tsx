"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

/** Navbar session chip — address opens menu with disconnect. */
export function ConnectAuth({ onAuthed, onLoggedOut }: Props) {
  const { disconnect } = useWallet();
  const [authedWallet, setAuthedWallet] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        setOpen(false);
        onLoggedOut();
      }
    };
    window.addEventListener(SESSION_EVENT, handler);
    return () => window.removeEventListener(SESSION_EVENT, handler);
  }, [onAuthed, onLoggedOut]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const logout = useCallback(async () => {
    setOpen(false);
    await fetch("/api/auth", { method: "DELETE" });
    setAuthedWallet(null);
    notifyNavSession(null);
    onLoggedOut();
    await disconnect();
  }, [disconnect, onLoggedOut]);

  if (!mounted || !authedWallet) return null;

  const short = `${authedWallet.slice(0, 4)}…${authedWallet.slice(-4)}`;

  return (
    <div className="nav-session-menu" ref={menuRef}>
      <button
        type="button"
        className="nav-chip nav-chip-btn mono"
        aria-haspopup="menu"
        aria-expanded={open}
        title={authedWallet}
        onClick={() => setOpen((v) => !v)}
      >
        {short}
      </button>
      {open ? (
        <div className="nav-session-dropdown" role="menu">
          <button
            type="button"
            className="nav-session-item"
            role="menuitem"
            onClick={() => void logout()}
          >
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
