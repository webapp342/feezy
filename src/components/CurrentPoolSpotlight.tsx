"use client";

type Props = {
  sol: number | null;
  loading?: boolean;
  bonusSol?: number;
  snapshotsPerDay?: number;
  className?: string;
};

export function CurrentPoolSpotlight({
  sol,
  loading = false,
  bonusSol = 100,
  snapshotsPerDay = 3,
  className = "",
}: Props) {
  return (
    <div className={`pool-spotlight ${className}`.trim()}>
      <p className="pool-spotlight-kicker">Current pool</p>
      {loading ? (
        <p className="pool-spotlight-loading muted">Loading…</p>
      ) : (
        <>
          <p className="pool-spotlight-value">
            {(sol ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}
            <span> SOL</span>
          </p>
          <p className="pool-spotlight-note muted small">
            Next snapshot split · +{bonusSol} SOL bonus · {snapshotsPerDay}×
            daily
          </p>
        </>
      )}
    </div>
  );
}
