import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { getRedis, LEADERBOARD_KEY } from "@/lib/redis";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  confirm: z.literal("RESET_ALL_PROGRESS"),
});

/**
 * Wipe XP / completions / referrals / leaderboard for clean testing.
 * Keeps: users, task definitions (raids), app_settings.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.error, admin.status);

  try {
    const body = bodySchema.safeParse(await req.json());
    if (!body.success) {
      return jsonError('Send { "confirm": "RESET_ALL_PROGRESS" }', 400);
    }

    const sql = getDb();
    const redis = getRedis();

    await sql`DELETE FROM user_tasks`;
    await sql`DELETE FROM referral_pending`;
    await sql`DELETE FROM sync_locks`;
    await sql`
      UPDATE xp_state SET
        holding_xp = 0,
        wallet_age_xp = 0,
        task_xp = 0,
        referral_xp = 0,
        total_xp = 0,
        updated_at = NOW()
    `;
    await sql`
      UPDATE wallet_state SET
        old_balance = 0,
        last_sync = NOW()
    `;

    await redis.del(LEADERBOARD_KEY);

    try {
      const keys = (await redis.keys("rl:*")) as string[];
      for (const k of keys || []) {
        await redis.del(k);
      }
      const authKeys = (await redis.keys("auth:nonce:*")) as string[];
      for (const k of authKeys || []) {
        await redis.del(k);
      }
    } catch (e) {
      console.warn("[admin/reset] redis key cleanup partial", e);
    }

    return jsonOk({
      reset: true,
      cleared: [
        "user_tasks",
        "referral_pending",
        "sync_locks",
        "xp_state",
        "wallet_state balances",
        "redis leaderboard",
      ],
      kept: ["users", "tasks (raid defs)", "app_settings"],
    });
  } catch (e) {
    console.error("[admin/reset]", e);
    return jsonError("Reset failed", 500);
  }
}
