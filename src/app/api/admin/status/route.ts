import { requireAdmin } from "@/lib/admin";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.error, admin.status);
  return jsonOk({ admin: true, wallet: admin.wallet });
}
