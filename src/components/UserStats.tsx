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
    task_xp: number;
    referral_xp: number;
    total_xp: number;
  };
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

  const loadMe = async () => {
    const res = await fetch("/api/me");
    const json = await res.json();
    if (json.ok) {
      setMe(json.data as Me);
      const origin = window.location.origin;
      setLink(`${origin}/?ref=${json.data.wallet}`);
    }
  };

  const runSync = async (manual: boolean) => {
    setSyncing(true);
    if (manual) setMsg(null);
    try {
      const res = await fetch("/api/sync-wallet", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Sync failed");
      if (manual) {
        setMsg(
          json.data.skipped
            ? "Cooldown — try again later"
            : `Synced · ${json.data.xp.total_xp.toLocaleString()} XP`,
        );
      }
      await loadMe();
    } catch (e) {
      if (manual) {
        setMsg(e instanceof Error ? e.message : "Sync failed");
      } else {
        // Still show cached profile if auto-sync fails (cooldown, RPC, etc.)
        await loadMe();
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!authed) {
      setMe(null);
      return;
    }
    void runSync(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, refreshKey]);

  const sync = () => void runSync(true);

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
              Connect to see how much ${BRAND.symbol} you hold and your weight.
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
            What you hold + raids + refs = your snapshot weight.
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

      {syncing && !me ? (
        <p className="muted small">Pulling on-chain balance…</p>
      ) : null}

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

          <div className="board-held-block">
            <div className="board-held-head">
              <Image
                src={BRAND.images.logo}
                alt=""
                width={20}
                height={20}
                className="board-token-icon"
                sizes="20px"
              />
              <span className="board-stat-label">Held</span>
            </div>
            <p className="board-held-value">
              {me.balance_ui.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}{" "}
              <span className="board-held-unit">${BRAND.symbol}</span>
            </p>
            <p className="muted small board-held-sub">
              In this wallet · synced from chain
            </p>
            {me.balance_ui <= 0 ? (
              <p className="muted small board-held-hint">
                Nothing here yet — hold ${BRAND.symbol} in this wallet to stack
                XP weight for fee drops.
              </p>
            ) : null}
          </div>

          <div className="board-xp-grid board-xp-grid-duo">
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
