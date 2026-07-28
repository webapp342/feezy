import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { SNAPSHOT_RULES, effectiveSnapshotPool } from "@/lib/snapshot-rules";
import { fetchCreatorUnclaimedFeesSol } from "@/lib/solana";

export const runtime = "nodejs";

/**
 * Current rewards = pump.fun unclaimed creator earnings for CREATOR_WALLET
 * + admin-configured pool bonus from DB.
 */
export async function GET() {
  try {
    const { CREATOR_WALLET } = getEnv();
    let onChainSol = 0;
    let error: string | null = null;
    try {
      onChainSol = await fetchCreatorUnclaimedFeesSol(CREATOR_WALLET);
    } catch (e) {
      error = e instanceof Error ? e.message : "RPC failed";
      console.error("[rewards]", e);
    }
    const { poolSol, bonusSol } = await effectiveSnapshotPool(onChainSol);

    return jsonOk(
      {
        creator_wallet: CREATOR_WALLET,
        current_rewards_sol: poolSol,
        on_chain_rewards_sol: onChainSol,
        pool_bonus_sol: bonusSol,
        current_rewards_error: error,
        distributed: [] as {
          id: string;
          at: string;
          amount_sol: number;
          winners: number;
        }[],
        rules: {
          snapshots_per_day: SNAPSHOT_RULES.snapshots_per_day,
          timing: SNAPSHOT_RULES.timing,
          top_xp_weighted: SNAPSHOT_RULES.top_xp_weighted,
          random_holders: SNAPSHOT_RULES.random_holders,
          weighted_pool_ratio: SNAPSHOT_RULES.weighted_pool_ratio,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    console.error("[rewards]", err);
    return jsonError("Failed to load rewards", 500);
  }
}
