import { readSession } from "./auth";
import { getEnv } from "./env";

export function isCreatorWallet(wallet: string): boolean {
  const creator = getEnv().CREATOR_WALLET.trim();
  return wallet.trim() === creator;
}

/** Session required + wallet must match CREATOR_WALLET. */
export async function requireAdmin(): Promise<
  | { ok: true; wallet: string; userId: string }
  | { ok: false; status: 401 | 403; error: string }
> {
  const session = await readSession();
  if (!session) {
    return { ok: false, status: 401, error: "Sign in required" };
  }
  if (!isCreatorWallet(session.wallet)) {
    return { ok: false, status: 403, error: "Admin only" };
  }
  return { ok: true, wallet: session.wallet, userId: session.sub };
}
