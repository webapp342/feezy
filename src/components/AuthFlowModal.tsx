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

/** Open site inside Phantom in-app browser (mobile). */
function openInPhantomBrowse() {
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  window.location.href = `https://phantom.app/ul/browse/${url}?ref=${ref}`;
}

/** Open site inside Solflare in-app browser (mobile). */
function openInSolflareBrowse() {
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  window.location.href = `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
}

function walletTag(ready: WalletReadyState, mobile: boolean) {
  if (ready === WalletReadyState.Installed) return "Detected";
  if (ready === WalletReadyState.Loadable) return mobile ? "Open app" : "Available";
  if (ready === WalletReadyState.NotDetected) {
    return mobile ? "Open app" : "Install";
  }
  return "";
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
    connect,
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
      onAuthed();
      notifyNavSession(wallet);

      const syncRes = await fetch("/api/sync-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "balance" }),
      });
      const syncJson = await syncRes.json();
      if (cancelled.current) return;
      if (!syncJson.ok) {
        console.warn("[sync-wallet]", syncJson.error);
        setDetail("Signed. Sync can retry from Your bag.");
      } else {
        setDetail("Bag synced. XP weight is live.");
        onAuthed();
      }

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

      const entry = wallets.find((w) => w.adapter.name === walletName);
      const ready = entry?.readyState;
      const name = String(walletName).toLowerCase();

      // Mobile Safari/Chrome: no extension inject. Deep-link into wallet browser.
      if (
        mobile &&
        ready !== WalletReadyState.Installed &&
        (name.includes("phantom") || name.includes("solflare"))
      ) {
        if (name.includes("phantom")) openInPhantomBrowse();
        else openInSolflareBrowse();
        setDetail("Opening wallet app… come back here after connect.");
        return;
      }

      // Desktop: NotDetected → install page
      if (ready === WalletReadyState.NotDetected && entry?.adapter.url) {
        window.open(entry.adapter.url, "_blank", "noopener,noreferrer");
        setDetail(`Install ${String(walletName)}, then refresh this page.`);
        setStep("wallet", "wait");
        return;
      }

      try {
        select(walletName);
        await connect();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Connection failed";
        // Adapter may still throw NotReady on Android — fall back to browse UL
        if (mobile && name.includes("phantom")) {
          openInPhantomBrowse();
          setDetail("Opening Phantom…");
          return;
        }
        if (mobile && name.includes("solflare")) {
          openInSolflareBrowse();
          setDetail("Opening Solflare…");
          return;
        }
        setPickError(msg);
        setDetail("Connection failed. Try again or pick another wallet.");
        setStep("wallet", "err");
      }
    },
    [connect, select, setStep, wallets, mobile],
  );

  // Installed / Loadable always. On mobile also surface NotDetected Solana wallets
  // so users see Phantom/Solflare instead of "No wallet detected".
  const availableWallets = wallets.filter((w) => {
    if (w.readyState === WalletReadyState.Unsupported) return false;
    if (
      w.readyState === WalletReadyState.Installed ||
      w.readyState === WalletReadyState.Loadable
    ) {
      return true;
    }
    if (mobile && w.readyState === WalletReadyState.NotDetected) {
      const n = String(w.adapter.name).toLowerCase();
      return n.includes("phantom") || n.includes("solflare");
    }
    return false;
  });

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
          ? "Tap Phantom or Solflare — opens in the wallet browser."
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
                <p className="muted small">
                  No Solana wallet in this browser. On phone, open this site
                  inside Phantom or Solflare (Browse), or tap below.
                </p>
                <div className="auth-wallet-fallback">
                  <button
                    type="button"
                    className="auth-wallet-btn"
                    onClick={() => openInPhantomBrowse()}
                  >
                    <span className="auth-wallet-name">Phantom</span>
                    <span className="auth-wallet-tag">Open app</span>
                  </button>
                  <button
                    type="button"
                    className="auth-wallet-btn"
                    onClick={() => openInSolflareBrowse()}
                  >
                    <span className="auth-wallet-name">Solflare</span>
                    <span className="auth-wallet-tag">Open app</span>
                  </button>
                </div>
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
                      <span className="auth-wallet-tag">
                        {walletTag(w.readyState, mobile)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {pickError ? <p className="error small">{pickError}</p> : null}
            {mobile ? (
              <p className="muted small auth-wallet-hint">
                Best on mobile: open the site from Phantom / Solflare Browse,
                then Connect → Sign.
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
