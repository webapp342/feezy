export type SnapshotRules = {
  top_xp_weighted: number;
  random_holders: number;
  /** Share of pool split XP-weighted among top tier (default 80%). */
  weighted_pool_ratio?: number;
};

export type SnapshotEstimate = {
  pool_sol: number;
  /** XP-weighted share if user is in top tier; null otherwise. */
  weighted_sol: number | null;
  /** Equal slice if picked in the random holder lottery. */
  random_slot_sol: number;
  in_top_tier: boolean;
};

export function estimateSnapshotEarnings(
  userXp: number,
  userRank: number | null,
  topEntries: { xp: number }[],
  poolSol: number,
  rules: SnapshotRules,
): SnapshotEstimate {
  const weightedRatio = rules.weighted_pool_ratio ?? 0.8;
  const randomRatio = 1 - weightedRatio;
  const topN = Math.max(1, rules.top_xp_weighted);
  const randomN = Math.max(1, rules.random_holders);

  const topTier = topEntries.slice(0, topN);
  const totalTopXp = topTier.reduce((sum, e) => sum + e.xp, 0);
  const inTopTier =
    userRank != null && userRank > 0 && userRank <= topN && topTier.length > 0;

  const weighted_sol =
    inTopTier && totalTopXp > 0 && poolSol > 0
      ? (userXp / totalTopXp) * poolSol * weightedRatio
      : null;

  const random_slot_sol =
    poolSol > 0 ? (poolSol * randomRatio) / randomN : 0;

  return {
    pool_sol: poolSol,
    weighted_sol,
    random_slot_sol,
    in_top_tier: inTopTier,
  };
}

export function formatEstSol(sol: number): string {
  if (sol <= 0) return "0 SOL";
  if (sol >= 0.01) {
    return `${sol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
  }
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 6 })} SOL`;
}
