import { firstRow, getDb } from "./db";
import { getEnv } from "./env";
import { rateLimitAllow, setLeaderboardScore } from "./redis";
import {
  fetchMintDecimals,
  fetchTokenBalanceRaw,
  fetchWalletFirstActivityAt,
  rawToUiAmount,
} from "./solana";
import { daysBetween } from "./xp";

export type SyncMode = "balance" | "full";

export type SyncResult = {
  wallet: string;
  balance_ui: number;
  balance_raw: string;
  skipped: boolean;
  reason?: string;
  mode: SyncMode;
  wallet_age_days?: number;
  xp: {
    holding_xp: number;
    wallet_age_xp: number;
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

/**
 * balance — RPC: token balance only. Age/task/referral from DB.
 * full    — same + discover on-chain first tx once if not cached.
 */
export async function syncWallet(params: {
  userId: string;
  walletAddress: string;
  mode?: SyncMode;
  force?: boolean;
}): Promise<SyncResult> {
  const env = getEnv();
  const sql = getDb();
  const wallet = params.walletAddress;
  const mode: SyncMode = params.mode ?? "balance";

  if (!params.force) {
    const allowed = await rateLimitAllow(
      `sync:${wallet}`,
      env.SYNC_COOLDOWN_SECONDS,
    );
    if (!allowed) {
      const xp = firstRow<{
        holding_xp: number;
        wallet_age_xp: number;
        task_xp: number;
        referral_xp: number;
        total_xp: number;
      }>(
        await sql`
          SELECT holding_xp, wallet_age_xp, task_xp, referral_xp, total_xp
          FROM xp_state WHERE user_id = ${params.userId}
        `,
      );
      const ws = firstRow<{
        old_balance: string;
        onchain_first_tx_at: string | null;
      }>(
        await sql`
          SELECT old_balance, onchain_first_tx_at
          FROM wallet_state WHERE user_id = ${params.userId}
        `,
      );
      const raw = BigInt(String(ws?.old_balance ?? 0));
      const ageDays = ws?.onchain_first_tx_at
        ? daysBetween(new Date(ws.onchain_first_tx_at))
        : undefined;
      return {
        wallet,
        balance_ui: rawToUiAmount(raw),
        balance_raw: raw.toString(),
        skipped: true,
        reason: "cooldown",
        mode,
        wallet_age_days: ageDays,
        xp: {
          holding_xp: Number(xp?.holding_xp ?? 0),
          wallet_age_xp: Number(xp?.wallet_age_xp ?? 0),
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

  const prev = firstRow<{
    old_balance: string;
    last_sync: string;
    onchain_first_tx_at: string | null;
  }>(
    await sql`
      SELECT old_balance, last_sync, onchain_first_tx_at
      FROM wallet_state WHERE user_id = ${user.id}
    `,
  );
  const oldRaw = BigInt(String(prev?.old_balance ?? 0));

  let firstTxAt: Date | null = prev?.onchain_first_tx_at
    ? new Date(prev.onchain_first_tx_at)
    : null;

  // Only RPC needed on every sign: token balance.
  // History scan runs at most once, and only on explicit full sync.
  const [balanceRaw, mintDecimals] = await Promise.all([
    fetchTokenBalanceRaw(wallet),
    fetchMintDecimals(),
  ]);
  if (!firstTxAt && mode === "full") {
    firstTxAt = await fetchWalletFirstActivityAt(wallet);
  }

  const balanceUi = rawToUiAmount(balanceRaw, mintDecimals);
  const firstTxIso = firstTxAt ? firstTxAt.toISOString() : null;

  await sql`
    INSERT INTO wallet_state (user_id, old_balance, last_sync, onchain_first_tx_at)
    VALUES (${user.id}, ${balanceRaw.toString()}, NOW(), ${firstTxIso})
    ON CONFLICT (user_id) DO UPDATE
      SET old_balance = EXCLUDED.old_balance,
          last_sync = EXCLUDED.last_sync,
          onchain_first_tx_at = COALESCE(
            wallet_state.onchain_first_tx_at,
            EXCLUDED.onchain_first_tx_at
          )
  `;

  const xpRow = firstRow<{
    holding_xp: number;
    wallet_age_xp: number;
    task_xp: number;
    referral_xp: number;
    total_xp: number;
  }>(
    await sql`
      SELECT holding_xp, wallet_age_xp, task_xp, referral_xp, total_xp
      FROM xp_state WHERE user_id = ${user.id}
    `,
  );
  const taskXp = Number(xpRow?.task_xp ?? 0);
  let referralXp = Number(xpRow?.referral_xp ?? 0);
  const existingAgeXp = Number(xpRow?.wallet_age_xp ?? 0);

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

  let ageDays: number;
  let walletAgeXp: number;

  if (firstTxAt) {
    // Cached (or newly discovered) on-chain age → recompute from days
    ageDays = daysBetween(firstTxAt);
    walletAgeXp = Math.min(
      env.WALLET_AGE_XP_CAP,
      Math.max(0, Math.floor(ageDays) * env.WALLET_AGE_XP_PER_DAY),
    );
  } else {
    // No history scan on balance sync — keep DB age XP as-is
    walletAgeXp = existingAgeXp;
    ageDays =
      env.WALLET_AGE_XP_PER_DAY > 0
        ? existingAgeXp / env.WALLET_AGE_XP_PER_DAY
        : 0;
  }

  const holdingXp = Math.max(
    0,
    Math.floor(balanceUi / env.HOLDING_XP_DIVISOR),
  );
  const xp = {
    holding_xp: holdingXp,
    wallet_age_xp: walletAgeXp,
    task_xp: taskXp,
    referral_xp: referralXp,
    total_xp: holdingXp + walletAgeXp + taskXp + referralXp,
  };

  const prevTotal = Number(xpRow?.total_xp ?? 0);
  const balanceChanged = balanceRaw !== oldRaw;
  const xpChanged = xp.total_xp !== prevTotal;

  if (balanceChanged || xpChanged || !xpRow) {
    await sql`
      INSERT INTO xp_state (
        user_id, holding_xp, wallet_age_xp, task_xp, referral_xp, total_xp, updated_at
      ) VALUES (
        ${user.id}, ${xp.holding_xp}, ${xp.wallet_age_xp},
        ${xp.task_xp}, ${xp.referral_xp}, ${xp.total_xp}, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        holding_xp = EXCLUDED.holding_xp,
        wallet_age_xp = EXCLUDED.wallet_age_xp,
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
    mode,
    wallet_age_days: ageDays,
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
