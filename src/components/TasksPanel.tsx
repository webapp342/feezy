"use client";

import { useCallback, useEffect, useState } from "react";

type Task = {
  id: string;
  type: string;
  title: string;
  reward_xp: number;
  completed: boolean;
  link_url?: string | null;
};

type Props = {
  refreshKey: number;
  onChanged: () => void;
  authed: boolean;
};

function fallbackHref(type: string): string | null {
  /** Only used when admin left link_url empty — raids should set URL in /admin. */
  switch (type) {
    case "telegram_join":
      return "https://t.me/feezyfun";
    case "twitter_follow":
      return "https://x.com/intent/follow?screen_name=ZugChain_org";
    case "twitter_share":
      return "https://twitter.com/intent/retweet?tweet_id=2082167574825996588";
    default:
      return null;
  }
}

export function TasksPanel({ refreshKey, onChanged, authed }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emptyMsg, setEmptyMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/tasks");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed");
      setTasks(json.data.tasks as Task[]);
      setEmptyMsg(json.data.message || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const complete = async (task: Task) => {
    if (!authed) {
      setError("Connect wallet first.");
      return;
    }
    const href = task.link_url || fallbackHref(task.type);
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    }

    setBusyId(task.id);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
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
    <section className="board-card">
      <header className="board-card-head">
        <div>
          <h2 className="board-card-title">Raids</h2>
          <p className="board-card-desc">
            Clear open raids for XP. Completed ones stay off this list.
          </p>
        </div>
        {tasks.length > 0 && (
          <span className="board-pill">{tasks.length} open</span>
        )}
      </header>

      {error && <p className="error small">{error}</p>}

      {tasks.length === 0 ? (
        <p className="muted board-empty-raids">
          {emptyMsg ||
            "No new raids right now. Check back when the next drop drops."}
        </p>
      ) : (
        <ul className="board-list">
          {tasks.map((t) => (
            <li key={t.id} className="board-list-row">
              <div className="board-list-main">
                <strong>{t.title}</strong>
                <span className="badge">+{t.reward_xp} XP</span>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!authed || busyId === t.id}
                onClick={() => void complete(t)}
              >
                {busyId === t.id ? "…" : "Claim"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
