import { firstRow, getDb } from "./db";
import { getEnv } from "./env";
import { rateLimitAllow, setLeaderboardScore } from "./redis";
import {
  fetchMintDecimals,
  fetchTokenBalanceRaw,
  rawToUiAmount,
} from "./solana";

export type SyncResult = {
  wallet: string;
  balance_ui: number;
  balance_raw: string;
  skipped: boolean;
  reason?: string;
  xp: {
    holding_xp: number;
    task_xp: number;
    referral_xp: number;
    total_xp: number;
  };
  referral_completed?: boolean;
};

type UserRow = {
  id: string;
  wallet_address: string;
  referrer_id: string | null;
  created_at: string;
};

/** RPC: token balance only. Task/referral XP from DB. */
export async function syncWallet(params: {
  userId: string;
  walletAddress: string;
  force?: boolean;
}): Promise<SyncResult> {
  const env = getEnv();
  const sql = getDb();
  const wallet = params.walletAddress;

  if (!params.force) {
    const allowed = await rateLimitAllow(
      `sync:${wallet}`,
      env.SYNC_COOLDOWN_SECONDS,
    );
    if (!allowed) {
      const xp = firstRow<{
        holding_xp: number;
        task_xp: number;
        referral_xp: number;
        total_xp: number;
      }>(
        await sql`
          SELECT holding_xp, task_xp, referral_xp, total_xp
          FROM xp_state WHERE user_id = ${params.userId}
        `,
      );
      const ws = firstRow<{ old_balance: string }>(
        await sql`
          SELECT old_balance FROM wallet_state WHERE user_id = ${params.userId}
        `,
      );
      const raw = BigInt(String(ws?.old_balance ?? 0));
      return {
        wallet,
        balance_ui: rawToUiAmount(raw),
        balance_raw: raw.toString(),
        skipped: true,
        reason: "cooldown",
        xp: {
          holding_xp: Number(xp?.holding_xp ?? 0),
          task_xp: Number(xp?.task_xp ?? 0),
          referral_xp: Number(xp?.referral_xp ?? 0),
          total_xp: Number(xp?.total_xp ?? 0),
        },
      };
    }
  }

  const user = firstRow<UserRow>(
    await sql`
      SELECT id, wallet_address, referrer_id, created_at
      FROM users WHERE id = ${params.userId}
    `,
  );
  if (!user || user.wallet_address !== wallet) {
    throw new Error("USER_MISMATCH");
  }

  const prev = firstRow<{ old_balance: string; last_sync: string }>(
    await sql`
      SELECT old_balance, last_sync FROM wallet_state WHERE user_id = ${user.id}
    `,
  );
  const oldRaw = BigInt(String(prev?.old_balance ?? 0));

  const [balanceRaw, mintDecimals] = await Promise.all([
    fetchTokenBalanceRaw(wallet),
    fetchMintDecimals(),
  ]);

  const balanceUi = rawToUiAmount(balanceRaw, mintDecimals);

  await sql`
    INSERT INTO wallet_state (user_id, old_balance, last_sync)
    VALUES (${user.id}, ${balanceRaw.toString()}, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET old_balance = EXCLUDED.old_balance,
          last_sync = EXCLUDED.last_sync
  `;

  const xpRow = firstRow<{
    holding_xp: number;
    task_xp: number;
    referral_xp: number;
    total_xp: number;
  }>(
    await sql`
      SELECT holding_xp, task_xp, referral_xp, total_xp
      FROM xp_state WHERE user_id = ${user.id}
    `,
  );
  const taskXp = Number(xpRow?.task_xp ?? 0);
  let referralXp = Number(xpRow?.referral_xp ?? 0);

  let referralCompleted = false;
  if (balanceUi > 0) {
    referralCompleted = await completeReferralIfNeeded(user.id);
    if (referralCompleted) {
      const fresh = firstRow<{ referral_xp: number }>(
        await sql`
          SELECT referral_xp FROM xp_state WHERE user_id = ${user.id}
        `,
      );
      referralXp = Number(fresh?.referral_xp ?? referralXp);
    }
  }

  const holdingXp = Math.max(
    0,
    Math.floor(balanceUi / env.HOLDING_XP_DIVISOR),
  );
  const xp = {
    holding_xp: holdingXp,
    task_xp: taskXp,
    referral_xp: referralXp,
    total_xp: holdingXp + taskXp + referralXp,
  };

  const prevTotal = Number(xpRow?.total_xp ?? 0);
  const balanceChanged = balanceRaw !== oldRaw;
  const xpChanged = xp.total_xp !== prevTotal;

  if (balanceChanged || xpChanged || !xpRow) {
    await sql`
      INSERT INTO xp_state (
        user_id, holding_xp, wallet_age_xp, task_xp, referral_xp, total_xp, updated_at
      ) VALUES (
        ${user.id}, ${xp.holding_xp}, 0,
        ${xp.task_xp}, ${xp.referral_xp}, ${xp.total_xp}, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        holding_xp = EXCLUDED.holding_xp,
        wallet_age_xp = 0,
        task_xp = EXCLUDED.task_xp,
        referral_xp = EXCLUDED.referral_xp,
        total_xp = EXCLUDED.total_xp,
        updated_at = NOW()
    `;
    await setLeaderboardScore(wallet, xp.total_xp);
  }

  return {
    wallet,
    balance_ui: balanceUi,
    balance_raw: balanceRaw.toString(),
    skipped: false,
    xp,
    referral_completed: referralCompleted || undefined,
  };
}

async function completeReferralIfNeeded(refereeId: string): Promise<boolean> {
  const env = getEnv();
  const sql = getDb();

  const row = firstRow<{
    id: string;
    referrer_id: string;
    referee_id: string;
  }>(
    await sql`
      SELECT id, referrer_id, referee_id
      FROM referral_pending
      WHERE referee_id = ${refereeId} AND status = 'pending'
      LIMIT 1
    `,
  );
  if (!row) return false;

  await sql`
    UPDATE referral_pending
    SET status = 'completed', completed_at = NOW()
    WHERE id = ${row.id} AND status = 'pending'
  `;

  await bumpReferralXp(row.referee_id, env.REFERRAL_XP_REFEREE);
  await bumpReferralXp(row.referrer_id, env.REFERRAL_XP_REFERRER);

  return true;
}

async function bumpReferralXp(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const sql = getDb();
  await sql`
    INSERT INTO xp_state (user_id, referral_xp, total_xp, updated_at)
    VALUES (${userId}, ${amount}, ${amount}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      referral_xp = xp_state.referral_xp + ${amount},
      total_xp = xp_state.total_xp + ${amount},
      updated_at = NOW()
  `;

  const u = firstRow<{ wallet_address: string }>(
    await sql`SELECT wallet_address FROM users WHERE id = ${userId}`,
  );
  const x = firstRow<{ total_xp: number }>(
    await sql`SELECT total_xp FROM xp_state WHERE user_id = ${userId}`,
  );
  if (u?.wallet_address && x) {
    await setLeaderboardScore(String(u.wallet_address), Number(x.total_xp));
  }
}

export async function ensureUser(params: {
  walletAddress: string;
  referrerWallet?: string | null;
}): Promise<{ userId: string; created: boolean }> {
  const sql = getDb();
  const wallet = params.walletAddress;

  const existing = firstRow<{ id: string }>(
    await sql`SELECT id FROM users WHERE wallet_address = ${wallet} LIMIT 1`,
  );
  if (existing?.id) {
    return { userId: String(existing.id), created: false };
  }

  let referrerId: string | null = null;
  if (params.referrerWallet && params.referrerWallet !== wallet) {
    const ref = firstRow<{ id: string }>(
      await sql`
        SELECT id FROM users WHERE wallet_address = ${params.referrerWallet} LIMIT 1
      `,
    );
    if (ref?.id) referrerId = String(ref.id);
  }

  const inserted = firstRow<{ id: string }>(
    await sql`
      INSERT INTO users (wallet_address, referrer_id)
      VALUES (${wallet}, ${referrerId})
      ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address
      RETURNING id
    `,
  );
  if (!inserted?.id) {
    throw new Error("USER_CREATE_FAILED");
  }
  const userId = String(inserted.id);

  await sql`
    INSERT INTO wallet_state (user_id) VALUES (${userId})
    ON CONFLICT DO NOTHING
  `;
  await sql`
    INSERT INTO xp_state (user_id) VALUES (${userId})
    ON CONFLICT DO NOTHING
  `;

  if (referrerId) {
    await sql`
      INSERT INTO referral_pending (referrer_id, referee_id, status)
      VALUES (${referrerId}, ${userId}, 'pending')
      ON CONFLICT (referee_id) DO NOTHING
    `;
  }

  return { userId, created: true };
}
