import { Redis } from "@upstash/redis";
import { getEnv } from "./env";

export const LEADERBOARD_KEY = "leaderboard";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (redisClient) return redisClient;
  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = getEnv();
  redisClient = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });
  return redisClient;
}

export async function setLeaderboardScore(
  walletAddress: string,
  totalXp: number,
): Promise<void> {
  const redis = getRedis();
  await redis.zadd(LEADERBOARD_KEY, {
    score: totalXp,
    member: walletAddress,
  });
}

export type LeaderboardEntry = {
  rank: number;
  wallet: string;
  xp: number;
};

export async function getLeaderboard(
  limit: number,
): Promise<LeaderboardEntry[]> {
  const redis = getRedis();
  const rows = await redis.zrange(LEADERBOARD_KEY, 0, limit - 1, {
    rev: true,
    withScores: true,
  });

  // Upstash returns [member, score, member, score, ...] or objects depending on version
  const entries: LeaderboardEntry[] = [];
  if (Array.isArray(rows) && rows.length > 0) {
    if (typeof rows[0] === "object" && rows[0] !== null && "score" in (rows[0] as object)) {
      (rows as { member: string; score: number }[]).forEach((row, i) => {
        entries.push({
          rank: i + 1,
          wallet: String(row.member),
          xp: Number(row.score),
        });
      });
    } else {
      for (let i = 0; i < rows.length; i += 2) {
        entries.push({
          rank: entries.length + 1,
          wallet: String(rows[i]),
          xp: Number(rows[i + 1]),
        });
      }
    }
  }
  return entries;
}

/** Simple Redis rate limit: returns true if allowed. */
export async function rateLimitAllow(
  key: string,
  windowSeconds: number,
): Promise<boolean> {
  if (windowSeconds <= 0) return true;
  const redis = getRedis();
  const fullKey = `rl:${key}`;
  const count = await redis.incr(fullKey);
  if (count === 1) {
    await redis.expire(fullKey, windowSeconds);
  }
  return count === 1;
}
