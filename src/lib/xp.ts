import { getEnv } from "./env";

export type XpBreakdown = {
  holding_xp: number;
  wallet_age_xp: number;
  task_xp: number;
  referral_xp: number;
  total_xp: number;
};

export type CalculateXpInput = {
  /** Human-readable token balance */
  balanceUi: number;
  /** Days since on-chain first activity (not app signup). */
  walletAgeDays: number;
  taskXp: number;
  referralXp: number;
};

export function calculateXP(input: CalculateXpInput): XpBreakdown {
  const env = getEnv();
  const holding_xp = Math.max(
    0,
    Math.floor(input.balanceUi / env.HOLDING_XP_DIVISOR),
  );
  const wallet_age_xp = Math.min(
    env.WALLET_AGE_XP_CAP,
    Math.max(0, Math.floor(input.walletAgeDays) * env.WALLET_AGE_XP_PER_DAY),
  );
  const task_xp = Math.max(0, Math.floor(input.taskXp));
  const referral_xp = Math.max(0, Math.floor(input.referralXp));
  const total_xp = holding_xp + wallet_age_xp + task_xp + referral_xp;

  return { holding_xp, wallet_age_xp, task_xp, referral_xp, total_xp };
}

export function daysBetween(from: Date, to: Date = new Date()): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}
