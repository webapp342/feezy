"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { ConnectAuth } from "./ConnectAuth";
import { IconPump, IconTelegram, IconX } from "./Icons";

function SocialLinks({ className = "" }: { className?: string }) {
  const { footerXUrl, footerTelegramUrl } = BRAND;
  if (!footerXUrl && !footerTelegramUrl) return null;
  return (
    <div className={className}>
      {footerXUrl ? (
        <a href={footerXUrl} target="_blank" rel="noreferrer" aria-label="X">
          <IconX />
        </a>
      ) : null}
      {footerTelegramUrl ? (
        <a
          href={footerTelegramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Telegram"
        >
          <IconTelegram />
        </a>
      ) : null}
    </div>
  );
}

type Props = {
  active?: "home" | "board";
  children: React.ReactNode;
  onAuthed?: () => void;
  onLoggedOut?: () => void;
};

export function SiteChrome({
  active = "home",
  children,
  onAuthed,
  onLoggedOut,
}: Props) {
  const handleAuthed = useCallback(() => {
    onAuthed?.();
  }, [onAuthed]);

  const handleLoggedOut = useCallback(() => {
    onLoggedOut?.();
  }, [onLoggedOut]);

  return (
    <>
      <nav className="navbar navbar-meme">
        <div className="navbar-inner">
          <Link className="nav-brand" href="/">
            <Image
              src={BRAND.images.logo}
              alt={`${BRAND.name} logo`}
              width={48}
              height={48}
              className="nav-logo"
              sizes="48px"
            />
            <div className="nav-brand-text">
              <p className="nav-brand-title">${BRAND.symbol}</p>
            </div>
          </Link>

          <div className="nav-links nav-links-meme">
            <Link
              href="/board"
              className={active === "board" ? "nav-active" : undefined}
            >
              Board
            </Link>
            <a href="/#how">Fees</a>
            <a href="/#howto">Buy</a>
            <a href="/#token">Loop</a>
          </div>

          <div className="nav-actions">
            <SocialLinks className="nav-social-desktop" />
            <a
              className="btn btn-pill btn-buy btn-nav btn-nav-buy"
              href={BRAND.buyUrl}
              target="_blank"
              rel="noreferrer"
            >
              <IconPump /> Buy
            </a>
            <ConnectAuth
              onAuthed={handleAuthed}
              onLoggedOut={handleLoggedOut}
            />
          </div>
        </div>
      </nav>
      {children}
      <footer className="footer page">
        <div className="footer-brand">
          <Image
            src={BRAND.images.logo}
            alt=""
            width={36}
            height={36}
            className="nav-logo"
            sizes="36px"
          />
          <div>
            <strong>${BRAND.symbol}</strong>
            <p className="muted small">{BRAND.tagline}</p>
          </div>
        </div>
        <div className="footer-social">
          <Link href="/board">XP Board</Link>
          <SocialLinks className="footer-social-icons" />
          <a href={BRAND.buyUrl} target="_blank" rel="noreferrer">
            pump.fun
          </a>
        </div>
        <p className="muted small footer-legal">
          Not financial advice. Memecoins are risky. Verify the CA. DYOR.
        </p>
      </footer>
    </>
  );
}

export function useAuthGate() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [authed, setAuthed] = useState(false);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  const onAuthed = useCallback(() => {
    setAuthed(true);
    bump();
  }, [bump]);
  const onLoggedOut = useCallback(() => {
    setAuthed(false);
    bump();
  }, [bump]);
  return { refreshKey, authed, bump, onAuthed, onLoggedOut };
}
