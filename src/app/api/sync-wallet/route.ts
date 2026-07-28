import { z } from "zod";
import { readSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { syncWallet } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z
  .object({
    /** balance = token RPC only (default). full = also discover on-chain age once. */
    mode: z.enum(["balance", "full"]).optional(),
  })
  .optional();

export async function POST(req: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    let mode: "balance" | "full" = "balance";
    try {
      const json = await req.json();
      const parsed = bodySchema.safeParse(json);
      if (parsed.success && parsed.data?.mode) {
        mode = parsed.data.mode;
      }
    } catch {
      // empty body → balance mode
    }

    const result = await syncWallet({
      userId: session.sub,
      walletAddress: session.wallet,
      mode,
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
