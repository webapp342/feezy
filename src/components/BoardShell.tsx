"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { SiteChrome, useAuthGate } from "./SiteChrome";
import { Leaderboard } from "./Leaderboard";
import { TasksPanel } from "./TasksPanel";
import { UserStats } from "./UserStats";
import { RewardsPanel } from "./RewardsPanel";

export function BoardShell() {
  const { refreshKey, authed, bump, onAuthed, onLoggedOut } = useAuthGate();
  const [meWallet, setMeWallet] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) {
      setMeWallet(null);
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/me");
        const json = await res.json();
        if (json.ok && json.data?.wallet) {
          setMeWallet(String(json.data.wallet));
        }
      } catch {
        setMeWallet(null);
      }
    })();
  }, [authed, refreshKey]);

  return (
    <SiteChrome active="board" onAuthed={onAuthed} onLoggedOut={onLoggedOut}>
      <main className="page board-page">
        <header className="board-hero board-hero-compact">
          <div className="board-hero-copy">
            <p className="board-kicker">Fee loop</p>
            <h1 className="board-title">XP Board</h1>
            <p className="board-hero-lead">
              Hold ${BRAND.symbol}, stack XP, catch creator-fee snapshots.
            </p>
            <div className="board-hero-actions">
              <a className="btn btn-pill btn-buy" href="#your-bag">
                Your bag
              </a>
              <Link className="btn btn-pill btn-ghost-light" href="/">
                ← Home
              </Link>
            </div>
          </div>
          <div className="board-hero-rewards">
            <RewardsPanel refreshKey={refreshKey} />
          </div>
        </header>

        <section className="board-layout">
          <div className="board-main">
            <Leaderboard
              refreshKey={refreshKey}
              variant="full"
              highlightWallet={meWallet}
            />
          </div>
          <aside className="board-dash">
            <UserStats
              refreshKey={refreshKey}
              authed={authed}
              onAuthed={onAuthed}
            />
            <TasksPanel
              refreshKey={refreshKey}
              authed={authed}
              onChanged={bump}
            />
          </aside>
        </section>
      </main>
    </SiteChrome>
  );
}
