import { readSession } from "@/lib/auth";
import { firstRow, getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { getLeaderboard, getWalletRank } from "@/lib/redis";
import { estimateSnapshotEarnings } from "@/lib/snapshot-estimate";
import { SNAPSHOT_RULES, effectiveSnapshotPool } from "@/lib/snapshot-rules";
import { fetchCreatorUnclaimedFeesSol, rawToUiAmount } from "@/lib/solana";
import { daysBetween } from "@/lib/xp";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await readSession();
    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    const sql = getDb();
    const user = firstRow<{
      id: string;
      wallet_address: string;
      referrer_id: string | null;
      created_at: string;
    }>(
      await sql`
        SELECT id, wallet_address, referrer_id, created_at
        FROM users WHERE id = ${session.sub}
      `,
    );
    if (!user) {
      return jsonError("User not found", 404);
    }

    const xp = firstRow<{
      holding_xp: number;
      wallet_age_xp: number;
      task_xp: number;
      referral_xp: number;
      total_xp: number;
      updated_at: string;
    }>(
      await sql`
        SELECT holding_xp, wallet_age_xp, task_xp, referral_xp, total_xp, updated_at
        FROM xp_state WHERE user_id = ${session.sub}
      `,
    );
    const ws = firstRow<{
      old_balance: string;
      last_sync: string;
      onchain_first_tx_at: string | null;
    }>(
      await sql`
        SELECT old_balance, last_sync, onchain_first_tx_at
        FROM wallet_state WHERE user_id = ${session.sub}
      `,
    );

    const pending = firstRow<{ status: string }>(
      await sql`
        SELECT status FROM referral_pending WHERE referee_id = ${session.sub} LIMIT 1
      `,
    );

    const referrals = firstRow<{ c: number }>(
      await sql`
        SELECT COUNT(*)::int AS c FROM referral_pending
        WHERE referrer_id = ${session.sub} AND status = 'completed'
      `,
    );

    const ageAnchor = ws?.onchain_first_tx_at
      ? new Date(ws.onchain_first_tx_at)
      : null;

    const balanceRaw = BigInt(String(ws?.old_balance ?? 0));
    const balanceUi = rawToUiAmount(balanceRaw);
    const board = await getWalletRank(user.wallet_address);
    const userXp = board?.xp ?? Number(xp?.total_xp ?? 0);
    const rank = board?.rank ?? null;

    const { CREATOR_WALLET } = getEnv();
    let onChainSol = 0;
    try {
      onChainSol = await fetchCreatorUnclaimedFeesSol(CREATOR_WALLET);
    } catch {
      onChainSol = 0;
    }
    const { poolSol } = await effectiveSnapshotPool(onChainSol);

    const topEntries = await getLeaderboard(SNAPSHOT_RULES.top_xp_weighted);
    const estimate = estimateSnapshotEarnings(
      userXp,
      rank,
      topEntries,
      poolSol,
      SNAPSHOT_RULES,
    );

    return jsonOk({
      wallet: user.wallet_address,
      created_at: user.created_at,
      balance_raw: balanceRaw.toString(),
      balance_ui: balanceUi,
      last_sync: ws?.last_sync ?? null,
      onchain_first_tx_at: ws?.onchain_first_tx_at ?? null,
      wallet_age_days: ageAnchor ? daysBetween(ageAnchor) : null,
      rank,
      board_xp: userXp,
      xp: {
        holding_xp: Number(xp?.holding_xp ?? 0),
        wallet_age_xp: Number(xp?.wallet_age_xp ?? 0),
        task_xp: Number(xp?.task_xp ?? 0),
        referral_xp: Number(xp?.referral_xp ?? 0),
        total_xp: Number(xp?.total_xp ?? 0),
      },
      referral_as_referee: pending?.status ?? null,
      referrals_completed: Number(referrals?.c ?? 0),
      estimate_next_drop: estimate,
    });
  } catch (err) {
    console.error("[me]", err);
    return jsonError("Failed to load profile", 500);
  }
}
