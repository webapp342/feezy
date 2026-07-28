import { requireAdmin } from "@/lib/admin";
import { firstRow, getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  reward_xp: z.number().int().min(0).max(10_000_000).optional(),
  link_url: z.string().url().nullable().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.error, admin.status);

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return jsonError("Invalid id", 400);
  }

  try {
    const body = patchSchema.safeParse(await req.json());
    if (!body.success) {
      return jsonError(body.error.issues[0]?.message || "Invalid body", 400);
    }
    const sql = getDb();
    const existing = firstRow<{ id: string }>(
      await sql`
        SELECT id FROM tasks WHERE id = ${id} AND deleted_at IS NULL
      `,
    );
    if (!existing) return jsonError("Raid not found", 404);

    const d = body.data;
    if (d.title != null) {
      await sql`UPDATE tasks SET title = ${d.title} WHERE id = ${id}`;
    }
    if (d.reward_xp != null) {
      await sql`UPDATE tasks SET reward_xp = ${d.reward_xp} WHERE id = ${id}`;
    }
    if (d.link_url !== undefined) {
      await sql`UPDATE tasks SET link_url = ${d.link_url} WHERE id = ${id}`;
    }
    if (d.active != null) {
      await sql`UPDATE tasks SET active = ${d.active} WHERE id = ${id}`;
    }
    if (d.sort_order != null) {
      await sql`UPDATE tasks SET sort_order = ${d.sort_order} WHERE id = ${id}`;
    }

    return jsonOk({ id, updated: true });
  } catch (e) {
    console.error("[admin/tasks PATCH]", e);
    return jsonError("Failed to update raid", 500);
  }
}

/** Soft-delete: keeps UUID + user_tasks history intact. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.error, admin.status);

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return jsonError("Invalid id", 400);
  }

  try {
    const sql = getDb();
    const row = firstRow<{ id: string }>(
      await sql`
        UPDATE tasks
        SET active = FALSE, deleted_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING id
      `,
    );
    if (!row) return jsonError("Raid not found", 404);
    return jsonOk({ id, deleted: true, soft: true });
  } catch (e) {
    console.error("[admin/tasks DELETE]", e);
    return jsonError("Failed to delete raid", 500);
  }
}
