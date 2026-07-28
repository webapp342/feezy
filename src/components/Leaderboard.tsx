"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { formatEstSol } from "@/lib/snapshot-estimate";
import { LazyImg } from "./LazyImg";

export type BoardEntry = {
  rank: number;
  wallet: string;
  xp: number;
  est_weighted_sol?: number | null;
  est_random_sol?: number;
};

type Props = {
  refreshKey?: number;
  /** Cap rows shown (teaser uses 5). */
  limit?: number;
  /** Compact teaser layout vs full board. */
  variant?: "full" | "teaser";
  highlightWallet?: string | null;
  className?: string;
};

function shortWallet(w: string) {
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

function teaserPayout(e: BoardEntry): string {
  if (e.est_weighted_sol != null) return formatEstSol(e.est_weighted_sol);
  if (e.est_random_sol != null && e.est_random_sol > 0) {
    return `${formatEstSol(e.est_random_sol)}†`;
  }
  return "—";
}

export function Leaderboard({
  refreshKey = 0,
  limit,
  variant = "full",
  highlightWallet = null,
  className = "",
}: Props) {
  const [entries, setEntries] = useState<BoardEntry[]>([]);
  const [poolSol, setPoolSol] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leaderboard");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      let list = json.data.entries as BoardEntry[];
      if (limit && limit > 0) list = list.slice(0, limit);
      setEntries(list);
      setPoolSol(Number(json.data.pool_sol ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (variant === "teaser") {
    const top = entries.slice(0, 5);

    return (
      <section className={`board-teaser ${className}`} id="board-preview">
        <div className="board-stage board-stage-pro">
          <div className="board-stage-top">
            <div>
              <p className="board-kicker">Live ranks</p>
              <h2 className="board-stage-title">Earn</h2>
              <p className="board-stage-sub">
                XP-weighted payout at the next snapshot
                {poolSol > 0 ? ` · pool ${formatEstSol(poolSol)}` : ""}.
              </p>
            </div>
            <Link className="btn btn-pill btn-buy btn-nav board-stage-cta" href="/board">
              Full board
            </Link>
          </div>

          {loading && <p className="muted board-stage-status">Loading ranks…</p>}
          {error && <p className="error board-stage-status">{error}</p>}
          {!loading && !error && top.length === 0 && (
            <p className="muted board-stage-status">
              No scores yet. Be first —{" "}
              <Link href="/board">sign in on the board</Link> and sync.
            </p>
          )}

          {top.length > 0 && (
            <ul className="board-ranklist board-ranklist-teaser">
              {top.map((e) => {
                const isLead = e.rank === 1;
                return (
                  <li
                    key={e.wallet}
                    className={[
                      "board-rankrow",
                      isLead ? "is-lead" : "",
                      highlightWallet === e.wallet ? "is-you" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span
                      className={`board-ranknum rank-tone-${Math.min(e.rank, 4)}`}
                    >
                      {e.rank}
                    </span>
                    <div className="board-rankmeta">
                      <div className="board-rankline board-rankline-pro">
                        <code className="mono board-rankwallet">
                          {shortWallet(e.wallet)}
                        </code>
                        {isLead ? (
                          <span className="board-lead-tag">Lead</span>
                        ) : null}
                        {highlightWallet === e.wallet ? (
                          <span className="board-you-tag">You</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="board-rankxp board-teaser-stats">
                      <strong>{e.xp.toLocaleString()}</strong>
                      <span>XP</span>
                      {poolSol > 0 ? (
                        <span className="board-teaser-payout">
                          {teaserPayout(e)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {poolSol > 0 && top.length > 0 && (
            <p className="muted small board-teaser-foot">
              Est. payout from current fee pool · top 80 by XP · † random slot
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className={`panel panel-with-sticker board-panel ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <LazyImg
        src={BRAND.images.stickers.laugh}
        alt=""
        className="panel-sticker panel-sticker-lg"
      />
      <div className="row between">
        <h2>XP Board</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
          Refresh
        </button>
      </div>
      <p className="muted small">
        XP-weighted fee share at next snapshot
        {poolSol > 0 ? ` · pool ${formatEstSol(poolSol)}` : ""}.
      </p>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="muted">No scores yet. Sign in and sync to show up.</p>
      )}
      {entries.length > 0 && (
        <div className="board-table-wrap">
        <table className="table board-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Wallet</th>
              <th>XP</th>
              {poolSol > 0 ? <th className="board-est-col">Est. payout</th> : null}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.wallet}
                className={
                  highlightWallet === e.wallet ? "board-row-you" : undefined
                }
              >
                <td>
                  {e.rank <= 3 ? (
                    <span className={`rank-badge rank-${e.rank}`}>
                      #{e.rank}
                    </span>
                  ) : (
                    e.rank
                  )}
                </td>
                <td className="mono">{shortWallet(e.wallet)}</td>
                <td>{e.xp.toLocaleString()}</td>
                {poolSol > 0 ? (
                  <td className="board-est-cell">
                    {e.est_weighted_sol != null ? (
                      <span title="XP-weighted payout (top 80)">
                        {formatEstSol(e.est_weighted_sol)}
                      </span>
                    ) : e.est_random_sol != null && e.est_random_sol > 0 ? (
                      <span
                        className="muted small"
                        title="Random payout slot (outside top 80)"
                      >
                        {formatEstSol(e.est_random_sol)}†
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {poolSol > 0 && entries.length > 0 && (
        <p className="muted small board-est-foot">
          Est. payout from current fee pool · top 80 by XP · † random slot
        </p>
      )}
    </div>
  );
}
