"use client";

import { SiteChrome, useAuthGate } from "./SiteChrome";
import { Hero } from "./Hero";
import {
  HowToBuy,
  LoreStrip,
  TokenomicsLite,
} from "./MemeSections";
import { Leaderboard } from "./Leaderboard";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LazyImg } from "./LazyImg";

export function AppShell() {
  const { refreshKey, onAuthed, onLoggedOut } = useAuthGate();

  return (
    <SiteChrome active="home" onAuthed={onAuthed} onLoggedOut={onLoggedOut}>
      <div id="top">
        <Hero />
      </div>

      <main className="page">
        <Leaderboard
          refreshKey={refreshKey}
          limit={3}
          variant="teaser"
        />

        <LoreStrip />
        <HowToBuy />
        <TokenomicsLite />

        <section className="earn-cta" id="earn">
          <div className="earn-cta-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <LazyImg
              src={BRAND.images.gifs.feeDrop}
              alt=""
              className="earn-cta-gif"
            />
            <div>
              <h2 className="section-title">Ready to stack weight?</h2>
              <p className="section-sub">
                Sign in on the board, sync your bag, clear raids, and climb
                before the next random fee drop.
              </p>
              <Link className="btn btn-pill btn-buy" href="/board">
                Earn
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
