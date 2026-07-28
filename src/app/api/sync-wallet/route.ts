import { readSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { syncWallet } from "@/lib/sync";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await readSession();
    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    const result = await syncWallet({
      userId: session.sub,
      walletAddress: session.wallet,
    });

    return jsonOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    if (message === "USER_MISMATCH") {
      return jsonError("Session wallet mismatch", 403);
    }
    console.error("[sync-wallet]", err);
    return jsonError("Sync failed", 500);
  }
}
