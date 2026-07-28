import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { getLeaderboard } from "@/lib/redis";

export const runtime = "nodejs";

/**
 * UI never hits Postgres — Redis ZSET only.
 * Short CDN/browser cache to protect Vercel free invocations.
 */
export async function GET() {
  try {
    const limit = getEnv().LEADERBOARD_LIMIT;
    const entries = await getLeaderboard(limit);

    return jsonOk(
      { entries, limit },
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
