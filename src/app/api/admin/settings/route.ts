import { requireAdmin } from "@/lib/admin";
import { jsonError, jsonOk } from "@/lib/http";
import {
  getSnapshotPoolBonusSol,
  setSnapshotPoolBonusSol,
} from "@/lib/settings";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.error, admin.status);

  try {
    const bonus = await getSnapshotPoolBonusSol();
    return jsonOk({
      snapshot_pool_bonus_sol: bonus,
      admin_wallet: admin.wallet,
    });
  } catch (e) {
    console.error("[admin/settings GET]", e);
    return jsonError("Failed to load settings", 500);
  }
}

const patchSchema = z.object({
  snapshot_pool_bonus_sol: z.number().min(0).max(1_000_000),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.error, admin.status);

  try {
    const body = patchSchema.safeParse(await req.json());
    if (!body.success) {
      return jsonError("Invalid bonus value", 400);
    }
    const bonus = await setSnapshotPoolBonusSol(
      body.data.snapshot_pool_bonus_sol,
    );
    return jsonOk({ snapshot_pool_bonus_sol: bonus });
  } catch (e) {
    console.error("[admin/settings PATCH]", e);
    return jsonError("Failed to save settings", 500);
  }
}
