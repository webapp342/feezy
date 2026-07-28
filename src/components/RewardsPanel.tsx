"use client";

import { useCallback, useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

type RewardsData = {
  current_rewards_sol: number;
  pool_bonus_sol?: number;
  current_rewards_error: string | null;
  rules: {
    snapshots_per_day: number;
    top_xp_weighted: number;
    random_holders: number;
  };
};

export function RewardsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rewards");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      setData(json.data as RewardsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section className="board-card rewards-panel">
      <header className="board-card-head">
        <div>
          <h2 className="board-card-title">Rewards</h2>
          <p className="board-card-desc">
            Unclaimed ${BRAND.symbol} creator fees on pump.fun — split at
            snapshot.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={load}
          aria-label="Refresh fee pool"
        >
          Refresh
        </button>
      </header>

      {loading && <p className="muted small">Loading pool…</p>}
      {error && <p className="error small">{error}</p>}

      {!loading && data && (
        <div className="rewards-pool">
          <p className="board-stat-label">Ready for next snapshot</p>
          <p className="board-stat-value">
            {data.current_rewards_sol.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}{" "}
            <span>SOL</span>
          </p>
          {data.current_rewards_error ? (
            <p className="error small">{data.current_rewards_error}</p>
          ) : (
            <p className="board-stat-foot muted small">
              Creator fees + {data.pool_bonus_sol ?? 100} SOL bonus ·{" "}
              {data.rules.snapshots_per_day}× daily, random times
            </p>
          )}
          <ul className="board-chip-list">
            <li>
              Top <strong>{data.rules.top_xp_weighted}</strong> by XP weight
            </li>
            <li>
              <strong>{data.rules.random_holders}</strong> random holders
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
