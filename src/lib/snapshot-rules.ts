/** Snapshot payout rules — shared by rewards, estimates, and UI copy. */
export const SNAPSHOT_RULES = {
  snapshots_per_day: 3,
  timing: "random" as const,
  top_xp_weighted: 80,
  random_holders: 20,
  /** 80% of pool → top tier, XP-weighted. 20% → random holder lottery. */
  weighted_pool_ratio: 0.8,
  /** Added to on-chain creator fees for display + snapshot split math. */
  pool_bonus_sol: 100,
} as const;

export type SnapshotRulesConfig = typeof SNAPSHOT_RULES;

export function getSnapshotPoolBonusSol(): number {
  const raw = process.env.SNAPSHOT_POOL_BONUS_SOL;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return SNAPSHOT_RULES.pool_bonus_sol;
}

/** On-chain creator fees + fixed bonus (default +100 SOL). */
export function effectiveSnapshotPool(onChainSol: number): number {
  return Math.max(0, onChainSol) + getSnapshotPoolBonusSol();
}
