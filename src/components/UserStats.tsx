"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { formatEstSol } from "@/lib/snapshot-estimate";
import { SignInButton } from "./SignInButton";

type SnapshotEstimate = {
  pool_sol: number;
  weighted_sol: number | null;
  random_slot_sol: number;
  in_top_tier: boolean;
};

type Me = {
  wallet: string;
  balance_ui: number;
  rank: number | null;
  board_xp: number;
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
  estimate_next_drop?: SnapshotEstimate;
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
          ? `Cooldown — try again later`
          : `Synced · ${json.data.xp.total_xp.toLocaleString()} XP`,
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
      <section className="board-card" id="your-bag">
        <header className="board-card-head">
          <div>
            <h2 className="board-card-title">Your bag</h2>
            <p className="board-card-desc">
              Connect to track ${BRAND.symbol} balance and XP weight.
            </p>
          </div>
        </header>
        <SignInButton onAuthed={onAuthed} className="btn btn-pill btn-buy" />
      </section>
    );
  }

  return (
    <section className="board-card" id="your-bag">
      <header className="board-card-head">
        <div>
          <h2 className="board-card-title">Your bag</h2>
          <p className="board-card-desc">
            XP weight decides your share when fees drop.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          disabled={syncing}
          onClick={sync}
        >
          {syncing ? "Syncing…" : "Sync"}
        </button>
      </header>

      {me && (
        <>
          <div className="board-stat-row board-stat-row-duo">
            <div className="board-stat-block">
              <span className="board-stat-label">Rank</span>
              <p className="board-stat-value sm">
                {me.rank != null ? `#${me.rank}` : "—"}
              </p>
            </div>
            <div className="board-stat-block">
              <span className="board-stat-label">Board XP</span>
              <p className="board-stat-value sm">
                {(me.board_xp || me.xp.total_xp).toLocaleString()}
              </p>
            </div>
          </div>

          {me.estimate_next_drop && me.estimate_next_drop.pool_sol > 0 && (
            <div className="board-estimate">
              <span className="board-stat-label">Est. payout</span>
              {me.estimate_next_drop.in_top_tier &&
              me.estimate_next_drop.weighted_sol != null ? (
                <>
                  <p className="board-estimate-value">
                    {formatEstSol(me.estimate_next_drop.weighted_sol)}
                  </p>
                  <p className="muted small board-estimate-note">
                    XP-weighted payout (top 80)
                  </p>
                </>
              ) : (
                <>
                  <p className="board-estimate-value muted-value">
                    Random pool only
                  </p>
                  <p className="muted small board-estimate-note">
                    Outside top 80 — eligible for random drop slots
                  </p>
                </>
              )}
              {me.estimate_next_drop.random_slot_sol > 0 && (
                <p className="muted small board-estimate-random">
                  + {formatEstSol(me.estimate_next_drop.random_slot_sol)} if
                  random slot (1 of 20)
                </p>
              )}
            </div>
          )}

          <div className="board-xp-grid">
            <div className="board-xp-cell board-holding-cell">
              <div className="board-token-label">
                <Image
                  src={BRAND.images.logo}
                  alt=""
                  width={18}
                  height={18}
                  className="board-token-icon"
                  sizes="18px"
                />
                <span className="muted small">${BRAND.symbol}</span>
              </div>
              <strong>
                {me.balance_ui.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </strong>
            </div>
            <div className="board-xp-cell">
              <span className="muted small">Wallet Age XP</span>
              <strong>{me.xp.wallet_age_xp.toLocaleString()}</strong>
            </div>
            <div className="board-xp-cell">
              <span className="muted small">Raids XP</span>
              <strong>{me.xp.task_xp.toLocaleString()}</strong>
            </div>
            <div className="board-xp-cell">
              <span className="muted small">Referrals XP</span>
              <strong>{me.xp.referral_xp.toLocaleString()}</strong>
            </div>
          </div>

          <div className="board-ref-row">
            <label className="board-stat-label">Referral link</label>
            <div className="row gap">
              <input className="input mono" readOnly value={link} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="muted small board-ref-note">
              Win-win: when your invite buys ${BRAND.symbol}, you both get{" "}
              {BRAND.referral.xpEach.toLocaleString()} XP — every referral.
            </p>
            <p className="muted small board-ref-meta">
              {me.referrals_completed} completed
              {me.last_sync
                ? ` · synced ${new Date(me.last_sync).toLocaleDateString()}`
                : ""}
            </p>
          </div>
        </>
      )}
      {msg && <p className="muted small">{msg}</p>}
    </section>
  );
}
