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
      setError("Sign in first.");
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

  return (
    <div className="panel">
      <h2>Raids</h2>
      <p className="muted small">
        Extra XP weight for the next fee snapshot. Each raid once per wallet.
      </p>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {tasks.map((t) => (
          <li key={t.id} className="list-row">
            <div>
              <strong>{t.title}</strong>
              <div className="muted small mono">{t.type}</div>
            </div>
            <div className="row gap">
              <span className="badge">+{t.reward_xp} XP</span>
              {t.completed ? (
                <span className="muted small">Done</span>
              ) : (
                <button
                  type="button"
                  className="btn"
                  disabled={!authed || busyId === t.id}
                  onClick={() => complete(t.id)}
                >
                  {busyId === t.id ? "…" : "Claim"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
