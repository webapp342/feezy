import { readSession } from "@/lib/auth";
import { firstRow, getDb, rows } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { setLeaderboardScore } from "@/lib/redis";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await readSession();
    const sql = getDb();

    const tasks = rows<{
      id: string;
      type: string;
      title: string;
      reward_xp: number;
      active: boolean;
      link_url: string | null;
    }>(
      await sql`
        SELECT id, type, title, reward_xp, active, link_url
        FROM tasks
        WHERE active = TRUE AND deleted_at IS NULL
        ORDER BY sort_order ASC, reward_xp DESC, created_at ASC
      `,
    );

    let completed = new Set<string>();
    if (session) {
      const done = rows<{ task_id: string }>(
        await sql`
          SELECT task_id FROM user_tasks WHERE user_id = ${session.sub}
        `,
      );
      completed = new Set(done.map((r) => String(r.task_id)));
    }

    const open = tasks
      .map((t) => ({
        id: String(t.id),
        type: String(t.type),
        title: String(t.title),
        reward_xp: Number(t.reward_xp),
        link_url: t.link_url ? String(t.link_url) : null,
        completed: completed.has(String(t.id)),
      }))
      .filter((t) => !t.completed);

    return jsonOk({
      tasks: open,
      empty: open.length === 0,
      message:
        open.length === 0
          ? "No new raids right now. Check back when the next drop drops."
          : null,
    });
  } catch (err) {
    console.error("[tasks]", err);
    return jsonError("Failed to load tasks", 500);
  }
}

const completeSchema = z.object({
  taskId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    const body = completeSchema.safeParse(await req.json());
    if (!body.success) {
      return jsonError("Invalid taskId", 400);
    }

    const sql = getDb();
    const task = firstRow<{
      id: string;
      type: string;
      reward_xp: number;
      active: boolean;
      deleted_at: string | null;
    }>(
      await sql`
        SELECT id, type, reward_xp, active, deleted_at
        FROM tasks WHERE id = ${body.data.taskId}
      `,
    );
    if (!task || !task.active || task.deleted_at) {
      return jsonError("Task not found", 404);
    }

    const existing = rows(
      await sql`
        SELECT 1 FROM user_tasks
        WHERE user_id = ${session.sub} AND task_id = ${body.data.taskId}
        LIMIT 1
      `,
    );
    if (existing.length > 0) {
      return jsonError("Task already completed", 409);
    }

    await sql`
      INSERT INTO user_tasks (user_id, task_id) VALUES (${session.sub}, ${body.data.taskId})
    `;

    const reward = Number(task.reward_xp);
    await sql`
      INSERT INTO xp_state (user_id, task_xp, total_xp, updated_at)
      VALUES (${session.sub}, ${reward}, ${reward}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        task_xp = xp_state.task_xp + ${reward},
        total_xp = xp_state.total_xp + ${reward},
        updated_at = NOW()
    `;

    const xp = firstRow<{ total_xp: number; task_xp: number }>(
      await sql`
        SELECT total_xp, task_xp FROM xp_state WHERE user_id = ${session.sub}
      `,
    );
    await setLeaderboardScore(session.wallet, Number(xp?.total_xp ?? 0));

    return jsonOk({
      taskId: body.data.taskId,
      type: task.type,
      reward_xp: reward,
      task_xp: Number(xp?.task_xp ?? 0),
      total_xp: Number(xp?.total_xp ?? 0),
    });
  } catch (err) {
    console.error("[tasks/complete]", err);
    return jsonError("Failed to complete task", 500);
  }
}
