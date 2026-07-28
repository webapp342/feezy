import { getSnapshotPoolBonusSol } from "./settings";

/** Snapshot payout rules — shared by rewards, estimates, and UI copy. */
export const SNAPSHOT_RULES = {
  snapshots_per_day: 3,
  timing: "random" as const,
  top_xp_weighted: 80,
  random_holders: 20,
  /** 80% of pool → top tier, XP-weighted. 20% → random holder lottery. */
  weighted_pool_ratio: 0.8,
} as const;

export type SnapshotRulesConfig = typeof SNAPSHOT_RULES;

/** On-chain creator fees + DB bonus (admin-configurable). */
export async function effectiveSnapshotPool(
  onChainSol: number,
): Promise<{ poolSol: number; bonusSol: number }> {
  const bonusSol = await getSnapshotPoolBonusSol();
  return {
    poolSol: Math.max(0, onChainSol) + bonusSol,
    bonusSol,
  };
}

export { getSnapshotPoolBonusSol };
