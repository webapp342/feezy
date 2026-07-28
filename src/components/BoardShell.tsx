"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { SiteChrome, useAuthGate } from "./SiteChrome";
import { Leaderboard } from "./Leaderboard";
import { TasksPanel } from "./TasksPanel";
import { UserStats } from "./UserStats";

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
        <header className="board-hero">
          <div className="board-hero-copy">
            <p className="board-kicker">Main loop</p>
            <h1 className="board-title">XP Board</h1>
            <p className="section-sub">
              Snapshot share follows XP weight. Sync your bag, clear raids,
              refer frens — show up heavy when creator fees drop (3× daily,
              random times).
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND.images.gifs.xp}
            alt=""
            className="board-hero-mascot"
          />
        </header>

        <section className="board-layout">
          <div className="board-main">
            <Leaderboard
              refreshKey={refreshKey}
              variant="full"
              highlightWallet={meWallet}
            />
          </div>
          <aside className="board-side">
            <div id="your-bag">
              <UserStats
                refreshKey={refreshKey}
                authed={authed}
                onAuthed={onAuthed}
              />
            </div>
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
