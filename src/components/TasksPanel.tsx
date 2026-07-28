"use client";

import { useCallback, useEffect, useState } from "react";

type Task = {
  id: string;
  type: string;
  title: string;
  reward_xp: number;
  completed: boolean;
};

type Props = {
  refreshKey: number;
  onChanged: () => void;
  authed: boolean;
};

export function TasksPanel({ refreshKey, onChanged, authed }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/tasks");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      setTasks(json.data.tasks as Task[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const complete = async (taskId: string) => {
    if (!authed) {
      setError("Connect wallet first.");
      return;
    }
    setBusyId(taskId);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const done = tasks.filter((t) => t.completed).length;

  return (
    <section className="board-card">
      <header className="board-card-head">
        <div>
          <h2 className="board-card-title">Raids</h2>
          <p className="board-card-desc">
            One-time tasks. Each adds XP before the next fee drop.
          </p>
        </div>
        {tasks.length > 0 && (
          <span className="board-pill">
            {done}/{tasks.length}
          </span>
        )}
      </header>

      {error && <p className="error small">{error}</p>}

      <ul className="board-list">
        {tasks.map((t) => (
          <li key={t.id} className="board-list-row">
            <div className="board-list-main">
              <strong>{t.title}</strong>
              <span className="badge">+{t.reward_xp} XP</span>
            </div>
            {t.completed ? (
              <span className="board-done">Done</span>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                disabled={!authed || busyId === t.id}
                onClick={() => complete(t.id)}
              >
                {busyId === t.id ? "…" : "Claim"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
