import { firstRow, getDb } from "./db";

const BONUS_KEY = "snapshot_pool_bonus_sol";

/** Read snapshot pool bonus (SOL) from DB; falls back to env then 100. */
export async function getSnapshotPoolBonusSol(): Promise<number> {
  try {
    const sql = getDb();
    const row = firstRow<{ value: string }>(
      await sql`SELECT value FROM app_settings WHERE key = ${BONUS_KEY} LIMIT 1`,
    );
    if (row?.value != null) {
      const n = Number(row.value);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch (e) {
    console.warn("[settings] bonus read failed", e);
  }
  const raw = process.env.SNAPSHOT_POOL_BONUS_SOL;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 100;
}

export async function setSnapshotPoolBonusSol(sol: number): Promise<number> {
  if (!Number.isFinite(sol) || sol < 0) {
    throw new Error("Bonus must be a number >= 0");
  }
  const value = String(sol);
  const sql = getDb();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${BONUS_KEY}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
  return sol;
}

export async function getSetting(key: string): Promise<string | null> {
  const sql = getDb();
  const row = firstRow<{ value: string }>(
    await sql`SELECT value FROM app_settings WHERE key = ${key} LIMIT 1`,
  );
  return row?.value ?? null;
}
