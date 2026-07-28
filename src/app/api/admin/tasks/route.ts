import { requireAdmin } from "@/lib/admin";
import { firstRow, getDb, rows } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.error, admin.status);

  try {
    const sql = getDb();
    const tasks = rows<{
      id: string;
      type: string;
      title: string;
      reward_xp: number;
      active: boolean;
      link_url: string | null;
      sort_order: number;
      created_at: string;
      deleted_at: string | null;
      completions: number;
    }>(
      await sql`
        SELECT
          t.id, t.type, t.title, t.reward_xp, t.active, t.link_url,
          t.sort_order, t.created_at, t.deleted_at,
          COALESCE(c.cnt, 0)::int AS completions
        FROM tasks t
        LEFT JOIN (
          SELECT task_id, COUNT(*)::int AS cnt FROM user_tasks GROUP BY task_id
        ) c ON c.task_id = t.id
        WHERE t.deleted_at IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC
      `,
    );

    return jsonOk({
      tasks: tasks.map((t) => ({
        id: String(t.id),
        type: String(t.type),
        title: String(t.title),
        reward_xp: Number(t.reward_xp),
        active: Boolean(t.active),
        link_url: t.link_url ? String(t.link_url) : null,
        sort_order: Number(t.sort_order ?? 0),
        created_at: t.created_at,
        completions: Number(t.completions ?? 0),
      })),
    });
  } catch (e) {
    console.error("[admin/tasks GET]", e);
    return jsonError("Failed to load raids", 500);
  }
}

const createSchema = z.object({
  type: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "type must be snake_case"),
  title: z.string().min(2).max(120),
  reward_xp: z.number().int().min(0).max(10_000_000),
  link_url: z.string().url().optional().nullable(),
  active: z.boolean().optional().default(true),
  sort_order: z.number().int().optional().default(0),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.error, admin.status);

  try {
    const body = createSchema.safeParse(await req.json());
    if (!body.success) {
      return jsonError(body.error.issues[0]?.message || "Invalid body", 400);
    }

    const sql = getDb();
    const { type, title, reward_xp, link_url, active, sort_order } = body.data;

    // Always INSERT new UUID — never reuse deleted task ids (completion history safe)
    const row = firstRow<{ id: string }>(
      await sql`
        INSERT INTO tasks (type, title, reward_xp, active, link_url, sort_order)
        VALUES (
          ${type},
          ${title},
          ${reward_xp},
          ${active ?? true},
          ${link_url ?? null},
          ${sort_order ?? 0}
        )
        RETURNING id
      `,
    );

    return jsonOk({
      id: String(row?.id),
      type,
      title,
      reward_xp,
      active: active ?? true,
      link_url: link_url ?? null,
    });
  } catch (e) {
    console.error("[admin/tasks POST]", e);
    return jsonError("Failed to create raid", 500);
  }
}
