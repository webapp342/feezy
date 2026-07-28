"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { getStoredReferrer, notifyNavSession } from "./ConnectAuth";

type StepId = "wallet" | "sign" | "sync" | "done";
type StepState = "wait" | "active" | "ok" | "err";

type Props = {
  open: boolean;
  onClose: () => void;
  onAuthed: () => void;
};

const STEP_META: { id: StepId; label: string; hint: string }[] = [
  {
    id: "wallet",
    label: "Connect wallet",
    hint: "Pick Phantom / Solflare and approve",
  },
  {
    id: "sign",
    label: "Sign",
    hint: "Approve the sign message in your wallet",
  },
  {
    id: "sync",
    label: "Sync bag",
    hint: "Pulling on-chain balance for XP weight",
  },
  { id: "done", label: "You're in", hint: "Board unlocked" },
];

function isMobileUa() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function inPhantomWebView() {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    phantom?: { solana?: { isPhantom?: boolean } };
    isPhantomInstalled?: boolean;
  };
  return !!(w.phantom?.solana?.isPhantom || w.isPhantomInstalled);
}

function inSolflareWebView() {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    solflare?: { isSolflare?: boolean };
    SolflareApp?: unknown;
  };
  return !!(w.solflare?.isSolflare || w.SolflareApp);
}

function inWalletWebView() {
  return inPhantomWebView() || inSolflareWebView();
}

/** Open site inside Solflare in-app browser (mobile). */
function openInSolflareBrowse() {
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  window.location.href = `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
}

function walletTag(ready: WalletReadyState, mobile: boolean) {
  if (ready === WalletReadyState.Installed) return "Detected";
  if (mobile) {
    if (
      ready === WalletReadyState.Loadable ||
      ready === WalletReadyState.NotDetected
    ) {
      return "Open app";
    }
  }
  return "";
}

function walletKind(name: string): "phantom" | "solflare" | null {
  const n = name.toLowerCase();
  if (n.includes("phantom")) return "phantom";
  if (n.includes("solflare")) return "solflare";
  return null;
}

/** Mobile: Phantom only when extension detected; Solflare always (Open app or Detected). */
function mobileWalletVisible(w: {
  adapter: { name: string };
  readyState: WalletReadyState;
}): boolean {
  const kind = walletKind(String(w.adapter.name));
  if (!kind) return false;
  if (kind === "phantom") {
    return w.readyState === WalletReadyState.Installed;
  }
  return (
    w.readyState === WalletReadyState.Installed ||
    w.readyState === WalletReadyState.Loadable ||
    w.readyState === WalletReadyState.NotDetected
  );
}

export function AuthFlowModal({ open, onClose, onAuthed }: Props) {
  const {
    publicKey,
    signMessage,
    connected,
    connecting,
    disconnect,
    wallets,
    select,
  } = useWallet();
  const [states, setStates] = useState<Record<StepId, StepState>>({
    wallet: "wait",
    sign: "wait",
    sync: "wait",
    done: "wait",
  });
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState("Pick a wallet to continue.");
  const [pickError, setPickError] = useState<string | null>(null);
  const ranSign = useRef(false);
  const cancelled = useRef(false);
  const mobile = useMemo(() => isMobileUa(), []);
  const walletWebView = useMemo(() => inWalletWebView(), []);

  const setStep = useCallback((id: StepId, state: StepState) => {
    setStates((s) => ({ ...s, [id]: state }));
  }, []);

  const reset = useCallback(() => {
    ranSign.current = false;
    setError(null);
    setDetail("Pick a wallet to continue.");
    setPickError(null);
    setStates({
      wallet: "wait",
      sign: "wait",
      sync: "wait",
      done: "wait",
    });
  }, []);

  const runSignAndSync = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Wallet does not support message signing.");
      setStep("sign", "err");
      return;
    }
    if (ranSign.current) return;
    ranSign.current = true;

    setStep("wallet", "ok");
    setStep("sign", "active");
    setDetail("Check your wallet — approve the sign message…");
    setError(null);

    try {
      const wallet = publicKey.toBase58();
      const nonceRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nonce", wallet }),
      });
      const nonceJson = await nonceRes.json();
      if (!nonceJson.ok) throw new Error(nonceJson.error || "Nonce failed");
      if (cancelled.current) return;

      const { nonce, message } = nonceJson.data as {
        nonce: string;
        message: string;
      };
      const sig = await signMessage(new TextEncoder().encode(message));
      if (cancelled.current) return;
      const signature = bs58.encode(sig);

      const verifyRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          wallet,
          signature,
          nonce,
          referrer: getStoredReferrer(),
        }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyJson.ok) throw new Error(verifyJson.error || "Verify failed");
      if (cancelled.current) return;

      setStep("sign", "ok");
      setStep("sync", "active");
      setDetail("Signed. Syncing your bag…");
      notifyNavSession(wallet);

      const syncRes = await fetch("/api/sync-wallet", { method: "POST" });
      const syncJson = await syncRes.json();
      if (cancelled.current) return;
      if (!syncJson.ok) {
        console.warn("[sync-wallet]", syncJson.error);
        setDetail("Signed. Sync can retry from Your bag.");
      } else {
        setDetail("Bag synced. XP weight is live.");
      }

      onAuthed();

      setStep("sync", "ok");
      setStep("done", "ok");
      setDetail("You're in. Catch the next fee drop.");
    } catch (e) {
      ranSign.current = false;
      const msg = e instanceof Error ? e.message : "Sign failed";
      setError(msg);
      setStep("sign", "err");
      setDetail(msg);
    }
  }, [publicKey, signMessage, onAuthed, setStep]);

  const connectWallet = useCallback(
    async (walletName: (typeof wallets)[number]["adapter"]["name"]) => {
      setPickError(null);
      setStep("wallet", "active");
      setDetail(`Connecting ${String(walletName)}…`);

      // Prefer Installed instance when duplicates exist (Wallet Standard + adapter)
      const matches = wallets.filter((w) => w.adapter.name === walletName);
      const entry =
        matches.find((w) => w.readyState === WalletReadyState.Installed) ||
        matches[0];
      if (!entry) {
        setPickError("Wallet not found");
        setStep("wallet", "err");
        return;
      }

      const ready = entry.readyState;
      const name = String(walletName).toLowerCase();
      const installed = ready === WalletReadyState.Installed;
      const alreadyInThisWallet =
        (name.includes("solflare") && inSolflareWebView()) ||
        (name.includes("phantom") && inPhantomWebView());

      // Mobile outside wallet app: Solflare → in-app browser (Phantom only if Detected in list)
      if (
        mobile &&
        !installed &&
        !alreadyInThisWallet &&
        !inWalletWebView() &&
        name.includes("solflare")
      ) {
        openInSolflareBrowse();
        setDetail("Opening Solflare… then tap Connect again inside the app.");
        return;
      }

      // Desktop: NotDetected → install page
      if (ready === WalletReadyState.NotDetected && entry.adapter.url) {
        window.open(entry.adapter.url, "_blank", "noopener,noreferrer");
        setDetail(`Install ${String(walletName)}, then refresh this page.`);
        setStep("wallet", "wait");
        return;
      }

      // MUST connect inside the click handler (user gesture) or Solflare/Phantom
      // popups get blocked and "Connecting…" hangs forever.
      try {
        select(walletName);
        await entry.adapter.connect();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Connection failed";
        setPickError(msg);
        setDetail("Connection failed. Approve in the wallet popup, or retry.");
        setStep("wallet", "err");
      }
    },
    [select, setStep, wallets, mobile],
  );

  // Dedupe by name — Wallet Standard + explicit adapter can both register Solflare
  const availableWallets = useMemo(() => {
    const ranked = wallets.filter((w) => {
      if (w.readyState === WalletReadyState.Unsupported) return false;
      if (mobile) return mobileWalletVisible(w);
      if (w.readyState === WalletReadyState.Installed) return true;
      if (w.readyState === WalletReadyState.Loadable) return true;
      return false;
    });

    const byName = new Map<string, (typeof ranked)[number]>();
    for (const w of ranked) {
      const key = String(w.adapter.name);
      const prev = byName.get(key);
      if (!prev) {
        byName.set(key, w);
        continue;
      }
      if (
        w.readyState === WalletReadyState.Installed &&
        prev.readyState !== WalletReadyState.Installed
      ) {
        byName.set(key, w);
      }
    }
    return [...byName.values()];
  }, [wallets, mobile]);

  useEffect(() => {
    if (!open) return;
    cancelled.current = false;
    reset();
    if (connected && publicKey) {
      setStep("wallet", "ok");
      setDetail("Wallet connected. Starting sign…");
      void runSignAndSync();
    } else {
      setStep("wallet", "active");
      setDetail(
        mobile
          ? walletWebView
            ? "Wallet detected — tap your wallet to connect."
            : "Tap Solflare to open in the app, then connect & sign."
          : "Pick a wallet to continue.",
      );
    }
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (connecting) {
      setStep("wallet", "active");
      setDetail("Connecting… approve in your wallet.");
    }
  }, [connecting, open, setStep]);

  useEffect(() => {
    if (!open) return;
    if (connected && publicKey && !ranSign.current) {
      setStep("wallet", "ok");
      setDetail("Connected. Starting sign…");
      void runSignAndSync();
    }
  }, [connected, publicKey, open, runSignAndSync, setStep]);

  if (!open) return null;

  const close = () => {
    cancelled.current = true;
    onClose();
  };

  return (
    <div className="auth-modal-backdrop" role="presentation" onClick={close}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-modal-head">
          <div>
            <p className="board-kicker">Wallet gate</p>
            <h2 id="auth-modal-title">Connect wallet</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
            Close
          </button>
        </div>

        <p className="auth-modal-live muted">{detail}</p>

        {!connected && states.wallet !== "ok" && (
          <div className="auth-wallet-picker">
            {availableWallets.length === 0 ? (
              <div className="auth-wallet-empty">
                {mobile ? (
                  <>
                    <p className="muted small">
                      Open this site in Solflare to connect, or install a
                      Solana wallet on mobile.
                    </p>
                    <div className="auth-wallet-fallback">
                      <button
                        type="button"
                        className="auth-wallet-btn"
                        onClick={() => openInSolflareBrowse()}
                      >
                        <span className="auth-wallet-name">Solflare</span>
                        <span className="auth-wallet-tag">Open app</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted small">
                    To continue you need a Solana wallet (Phantom, Solflare, or
                    another Solana-compatible wallet). Install one, then refresh
                    this page.
                  </p>
                )}
              </div>
            ) : (
              <ul className="auth-wallet-list">
                {availableWallets.map((w) => (
                  <li key={w.adapter.name}>
                    <button
                      type="button"
                      className="auth-wallet-btn"
                      disabled={connecting}
                      onClick={() => void connectWallet(w.adapter.name)}
                    >
                      {w.adapter.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={w.adapter.icon}
                          alt=""
                          width={28}
                          height={28}
                          className="auth-wallet-icon"
                        />
                      ) : (
                        <span className="auth-wallet-icon auth-wallet-icon-fallback" />
                      )}
                      <span className="auth-wallet-name">{w.adapter.name}</span>
                      {walletTag(w.readyState, mobile) ? (
                        <span className="auth-wallet-tag">
                          {walletTag(w.readyState, mobile)}
                        </span>
                      ) : (
                        <span className="auth-wallet-tag" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {pickError ? <p className="error small">{pickError}</p> : null}
            {mobile ? (
              <p className="muted small auth-wallet-hint">
                Mobile: Solflare opens in-app browser. Phantom only if already
                detected on your browser.
              </p>
            ) : null}
          </div>
        )}

        <ol className="auth-steps">
          {STEP_META.map((s) => (
            <li key={s.id} className={`auth-step is-${states[s.id]}`}>
              <span className="auth-step-dot" aria-hidden />
              <div>
                <strong>{s.label}</strong>
                <p className="muted small">{s.hint}</p>
              </div>
              <span className="auth-step-status">
                {states[s.id] === "ok"
                  ? "Done"
                  : states[s.id] === "active"
                    ? "…"
                    : states[s.id] === "err"
                      ? "Fail"
                      : ""}
              </span>
            </li>
          ))}
        </ol>

        {error && <p className="error">{error}</p>}

        <div className="auth-modal-actions">
          {connected && states.sign === "err" && (
            <button
              type="button"
              className="btn btn-pill btn-buy"
              onClick={() => {
                ranSign.current = false;
                void runSignAndSync();
              }}
            >
              Retry sign
            </button>
          )}
          {states.done === "ok" && (
            <button
              type="button"
              className="btn btn-pill btn-buy"
              onClick={close}
            >
              Continue
            </button>
          )}
          {connected && states.done !== "ok" && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                cancelled.current = true;
                ranSign.current = false;
                await disconnect();
                reset();
                setStep("wallet", "active");
                setDetail("Pick another wallet…");
              }}
            >
              Switch wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
