import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { getEnv } from "./env";

export type Sql = NeonQueryFunction<false, false>;

let sqlClient: Sql | null = null;

export function getDb(): Sql {
  if (sqlClient) return sqlClient;
  const { DATABASE_URL } = getEnv();
  sqlClient = neon(DATABASE_URL);
  return sqlClient;
}

/** Normalize neon result rows to a plain array of records. */
export function rows<T extends Record<string, unknown>>(
  result: unknown,
): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  return [];
}

export function firstRow<T extends Record<string, unknown>>(
  result: unknown,
): T | undefined {
  return rows<T>(result)[0];
}
