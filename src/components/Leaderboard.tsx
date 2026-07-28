"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export type BoardEntry = { rank: number; wallet: string; xp: number };

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

export function Leaderboard({
  refreshKey = 0,
  limit,
  variant = "full",
  highlightWallet = null,
  className = "",
}: Props) {
  const [entries, setEntries] = useState<BoardEntry[]>([]);
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
    const leader = top[0];
    const maxXp = leader?.xp || 1;

    return (
      <section className={`board-teaser ${className}`} id="board-preview">
        <div className="board-stage">
          <div className="board-stage-top">
            <div>
              <p className="board-kicker">Live ranks</p>
              <h2 className="board-stage-title">XP Board</h2>
              <p className="board-stage-sub">
                Heaviest bags before the next random fee snapshot.
              </p>
            </div>
            <Link className="btn btn-pill btn-buy board-stage-cta" href="/board">
              Open full board
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
            <ol className="board-ranklist">
              {top.map((e) => {
                const pct = Math.max(6, Math.round((e.xp / maxXp) * 100));
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
                    <span className={`board-ranknum rank-tone-${Math.min(e.rank, 4)}`}>
                      {e.rank}
                    </span>
                    <div className="board-rankmeta">
                      <div className="board-rankline">
                        <code className="mono board-rankwallet">
                          {shortWallet(e.wallet)}
                        </code>
                        {isLead ? (
                          <span className="board-lead-tag">Leading</span>
                        ) : null}
                        {highlightWallet === e.wallet ? (
                          <span className="board-you-tag">You</span>
                        ) : null}
                      </div>
                      <div className="board-bar" aria-hidden>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="board-rankxp">
                      <strong>{e.xp.toLocaleString()}</strong>
                      <span>XP</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="board-stage-foot">
            <p className="muted small">
              Sync bag · clear raids · climb before the drop
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.images.stickers.point}
              alt=""
              className="board-stage-sticker"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className={`panel panel-with-sticker board-panel ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
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
        Who&apos;s heaviest before the next fee snapshot.
      </p>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="muted">No scores yet. Sign in and sync to show up.</p>
      )}
      {entries.length > 0 && (
        <table className="table board-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Wallet</th>
              <th>XP</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
