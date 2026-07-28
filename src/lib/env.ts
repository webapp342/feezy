import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  SOLANA_RPC_URL: z.string().url(),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url().optional(),
  TOKEN_MINT: z.string().min(32).max(64),
  TOKEN_DECIMALS: z.coerce.number().int().min(0).max(18).default(6),
  HOLDING_XP_DIVISOR: z.coerce.number().positive().default(1),
  REFERRAL_XP_REFERRER: z.coerce.number().int().min(0).default(20000),
  REFERRAL_XP_REFEREE: z.coerce.number().int().min(0).default(20000),
  SYNC_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(60),
  LEADERBOARD_LIMIT: z.coerce.number().int().min(1).max(500).default(100),
  /** Creator wallet — unclaimed pump.fun creator earnings shown as current rewards. */
  CREATOR_WALLET: z
    .string()
    .min(32)
    .max(64)
    .default("F3Z961xu1uaBgLcyJZnXzmP4aJiyoFAqGPYiDrz7LMy5"),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

/** Server-only env. Throws if misconfigured (fail fast). */
export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  cached = parsed.data;
  return cached;
}

export function getPublicRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com"
  );
}
