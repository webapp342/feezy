"use client";

import { useEffect, useState } from "react";
import { SignInButton } from "./SignInButton";

type Me = {
  wallet: string;
  balance_ui: number;
  xp: {
    holding_xp: number;
    wallet_age_xp: number;
    task_xp: number;
    referral_xp: number;
    total_xp: number;
  };
  wallet_age_days: number | null;
  onchain_first_tx_at: string | null;
  referrals_completed: number;
  last_sync: string | null;
};

type Props = {
  refreshKey: number;
  authed: boolean;
  onAuthed: () => void;
};

export function UserStats({ refreshKey, authed, onAuthed }: Props) {
  const [me, setMe] = useState<Me | null>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) {
      setMe(null);
      return;
    }
    void (async () => {
      const res = await fetch("/api/me");
      const json = await res.json();
      if (json.ok) {
        setMe(json.data as Me);
        const origin = window.location.origin;
        setLink(`${origin}/?ref=${json.data.wallet}`);
      }
    })();
  }, [authed, refreshKey]);

  const sync = async () => {
    setSyncing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full" }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Sync failed");
      setMsg(
        json.data.skipped
          ? `Cooldown — try again later (${json.data.reason})`
          : `Synced. Age ~${Math.floor(json.data.wallet_age_days ?? 0)}d · Total XP: ${json.data.xp.total_xp}`,
      );
      const meRes = await fetch("/api/me");
      const meJson = await meRes.json();
      if (meJson.ok) setMe(meJson.data as Me);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!authed) {
    return (
      <div className="panel">
        <h2>Your bag</h2>
        <p className="muted">
          Connect wallet + sign in one flow to unlock XP weight and referral
          link.
        </p>
        <div style={{ marginTop: "0.75rem" }}>
          <SignInButton onAuthed={onAuthed} className="btn btn-pill btn-buy" />
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="row between">
        <h2>Your bag</h2>
        <button
          type="button"
          className="btn"
          disabled={syncing}
          onClick={sync}
        >
          {syncing ? "Syncing…" : "Sync wallet"}
        </button>
      </div>
      {me && (
        <>
          <table className="table compact">
            <tbody>
              <tr>
                <td>Token balance</td>
                <td>
                  {me.balance_ui.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
              <tr>
                <td>Holding XP</td>
                <td>{me.xp.holding_xp.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Wallet age XP</td>
                <td>
                  {me.xp.wallet_age_xp.toLocaleString()}
                  {me.wallet_age_days != null
                    ? ` (${Math.floor(me.wallet_age_days)}d)`
                    : ""}
                </td>
              </tr>
              <tr>
                <td>Tasks XP</td>
                <td>{me.xp.task_xp.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Referral XP</td>
                <td>{me.xp.referral_xp.toLocaleString()}</td>
              </tr>
              <tr>
                <td>
                  <strong>Total XP</strong>
                </td>
                <td>
                  <strong>{me.xp.total_xp.toLocaleString()}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="muted small">
            Holding XP tracks your bag. Raids and referrals add weight for fee
            snapshots (3× daily, random times).
          </p>
          <p className="muted small">
            Referrals completed: {me.referrals_completed}
            {me.last_sync
              ? ` · Last sync ${new Date(me.last_sync).toLocaleString()}`
              : ""}
          </p>
          <div className="referral">
            <label className="muted small">Your referral link</label>
            <div className="row gap">
              <input className="input mono" readOnly value={link} />
              <button type="button" className="btn btn-ghost" onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </>
      )}
      {msg && <p className="muted small">{msg}</p>}
    </div>
  );
}
