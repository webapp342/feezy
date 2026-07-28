"use client";

import { useState } from "react";
import Image from "next/image";
import { BRAND, shortMint } from "@/lib/brand";
import {
  IconChart,
  IconCopy,
  IconExternal,
  IconPump,
  StampBadge,
} from "./Icons";
import { LazyImg } from "./LazyImg";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const s = BRAND.images.stickers;

  const copyMint = async () => {
    await navigator.clipboard.writeText(BRAND.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="hero-fullscreen">
      <Image
        src={BRAND.images.bg}
        alt=""
        fill
        priority
        className="hero-bg"
        sizes="100vw"
      />
      <div className="hero-grain" aria-hidden />
      <div className="hero-inner">
        <div className="hero-copy">
          <StampBadge className="hero-stamp" />
          <p className="hero-kicker">#WELCOME TO ${BRAND.symbol}</p>
          <h1 className="hero-title">{BRAND.name.toUpperCase()}</h1>
          <p className="hero-sub">{BRAND.tagline}</p>
          <p className="hero-blurb">
            Creator fees get snapped 3× a day at random times and split to
            holders by XP weight. Stack XP. Catch the drop.
          </p>
          <div className="hero-ctas">
            <a
              className="btn btn-pill btn-buy"
              href={BRAND.buyUrl}
              target="_blank"
              rel="noreferrer"
            >
              <IconPump /> Buy ${BRAND.symbol}
            </a>
            <a
              className="btn btn-pill btn-ghost-light"
              href={BRAND.chartUrl}
              target="_blank"
              rel="noreferrer"
            >
              <IconChart /> Chart
            </a>
            <a className="btn btn-pill btn-ghost-light" href="/board">
              XP Board
            </a>
          </div>
          <div className="mint-row">
            <span className="muted small">CA</span>
            <code className="mint-code mono" title={BRAND.mint}>
              {shortMint(BRAND.mint)}
            </code>
            <button
              type="button"
              className="btn btn-pill btn-ghost-light btn-sm"
              onClick={copyMint}
            >
              <IconCopy /> {copied ? "Copied" : "Copy"}
            </button>
            <a
              className="btn btn-pill btn-ghost-light btn-sm"
              href={BRAND.solscanUrl}
              target="_blank"
              rel="noreferrer"
            >
              <IconExternal /> Solscan
            </a>
          </div>
        </div>
        <div className="hero-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND.images.gifs.feeDrop}
            alt={`${BRAND.name} catching creator fee drops`}
            className="hero-img hero-gif-main"
            width={640}
            height={640}
            fetchPriority="high"
            decoding="async"
          />
          <div className="hero-floaters" aria-hidden>
            <LazyImg src={s.laugh} alt="" className="floater floater-a" />
            <LazyImg src={BRAND.images.coin} alt="" className="floater floater-b" />
            <LazyImg src={s.point} alt="" className="floater floater-c" />
            <LazyImg src={s.logo} alt="" className="floater floater-d" />
          </div>
        </div>
      </div>
    </section>
  );
}
