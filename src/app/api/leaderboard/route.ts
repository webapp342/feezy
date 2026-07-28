import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/redis";
import { estimateSnapshotEarnings } from "@/lib/snapshot-estimate";
import { SNAPSHOT_RULES, effectiveSnapshotPool } from "@/lib/snapshot-rules";
import { fetchCreatorUnclaimedFeesSol } from "@/lib/solana";

export const runtime = "nodejs";

/**
 * UI never hits Postgres — Redis ZSET only.
 * Short CDN/browser cache to protect Vercel free invocations.
 */
export async function GET() {
  try {
    const limit = getEnv().LEADERBOARD_LIMIT;
    const entries = await getLeaderboard(limit);

    const { CREATOR_WALLET } = getEnv();
    let onChainSol = 0;
    try {
      onChainSol = await fetchCreatorUnclaimedFeesSol(CREATOR_WALLET);
    } catch {
      onChainSol = 0;
    }
    const { poolSol } = await effectiveSnapshotPool(onChainSol);

    const topTier = entries.slice(0, SNAPSHOT_RULES.top_xp_weighted);
    const enriched = entries.map((e: LeaderboardEntry) => {
      const est = estimateSnapshotEarnings(
        e.xp,
        e.rank,
        topTier,
        poolSol,
        SNAPSHOT_RULES,
      );
      return {
        ...e,
        est_weighted_sol: est.weighted_sol,
        est_random_sol: est.random_slot_sol,
      };
    });

    return jsonOk(
      {
        entries: enriched,
        limit,
        pool_sol: poolSol,
        rules: {
          top_xp_weighted: SNAPSHOT_RULES.top_xp_weighted,
          random_holders: SNAPSHOT_RULES.random_holders,
          weighted_pool_ratio: SNAPSHOT_RULES.weighted_pool_ratio,
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=15, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    console.error("[leaderboard]", err);
    return jsonError("Failed to load leaderboard", 500);
  }
}
