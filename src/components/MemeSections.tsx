import { BRAND } from "@/lib/brand";
import { IconPump } from "./Icons";

const steps = [
  {
    n: "01",
    title: "Get a Solana wallet",
    body: "Phantom or Solflare — same wallets you already use.",
    img: BRAND.images.stickers.logo,
    tilt: -4,
  },
  {
    n: "02",
    title: `Buy $${BRAND.symbol}`,
    body: "Tap Buy — goes to pump.fun. Always double-check the contract.",
    img: BRAND.images.stickers.bags,
    tilt: 3,
  },
  {
    n: "03",
    title: "Sign in & sync",
    body: "Connect wallet, sign in, sync your bag so your XP weight is up to date.",
    img: BRAND.images.gifs.timer,
    tilt: -2,
  },
  {
    n: "04",
    title: "Stack XP weight",
    body: "Hold, finish raids, refer frens. More XP = bigger share when fees drop.",
    img: BRAND.images.gifs.xp,
    tilt: 5,
  },
];

const loop = [
  {
    label: "Fees",
    value: "Creator fees in",
    img: BRAND.images.gifs.eat,
    note: "Feezy eats the fees",
  },
  {
    label: "Snapshots",
    value: "3× daily · random",
    img: BRAND.images.gifs.timer,
    note: "Nobody knows the exact second",
  },
  {
    label: "Split",
    value: "XP-weighted",
    img: BRAND.images.gifs.xp,
    note: "Heavier XP = bigger bag",
  },
];

export function LoreStrip() {
  return (
    <section className="lore lore-meme" id="how">
      <div className="lore-visual lore-visual-free">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.images.gifs.eat}
          alt={`${BRAND.name} eating creator fees`}
          className="lore-mascot lore-mascot-xl"
          width={720}
          height={720}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.images.coin}
          alt=""
          className="lore-coin"
          width={160}
          height={160}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.images.stickers.laugh}
          alt=""
          className="lore-floater"
          width={180}
          height={180}
        />
      </div>
      <div className="lore-text">
        <h2 className="section-title">Creator fees → holders</h2>
        <p className="section-sub">
          ${BRAND.symbol} takes creator fees and sends them back to the bag
          holders. Three times a day, at random times, we snapshot XP and split
          fees by XP weight — not by who yelled loudest.
        </p>
        <ul className="lore-points">
          <li>3 random snapshots every day</li>
          <li>Fees split by XP weight at snapshot</li>
          <li>Holding, raids, and referrals build your weight</li>
        </ul>
      </div>
    </section>
  );
}

export function HowToBuy() {
  return (
    <section className="howto howto-meme" id="howto">
      <h2 className="section-title">How to ape</h2>
      <p className="section-sub">Four steps. Then stack XP for fee drops.</p>
      <ol className="howto-stage">
        {steps.map((s, i) => (
          <li
            key={s.n}
            className={`howto-chip howto-chip-${i + 1}`}
            style={{ ["--tilt" as string]: `${s.tilt}deg` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.img} alt="" className="howto-sticker-xl" />
            <div className="howto-chip-body">
              <span className="howto-n">{s.n}</span>
              <strong>{s.title}</strong>
              <p className="muted small">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <a
        className="btn btn-pill btn-buy howto-buy"
        href={BRAND.buyUrl}
        target="_blank"
        rel="noreferrer"
      >
        <IconPump /> Buy on pump.fun
      </a>
    </section>
  );
}

export function TokenomicsLite() {
  return (
    <section className="tok tok-meme" id="token">
      <h2 className="section-title">The loop</h2>
      <div className="tok-flow">
        {loop.map((item, i) => (
          <div key={item.label} className="tok-step">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.img} alt="" className="tok-sticker-xl" />
            <span className="muted small">{item.label}</span>
            <p className="tok-val">{item.value}</p>
            <p className="muted small">{item.note}</p>
            {i < loop.length - 1 ? (
              <span className="tok-arrow" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function PartnerBar() {
  return (
    <div className="partner-bar" aria-label="Links">
      <a href={BRAND.buyUrl} target="_blank" rel="noreferrer">
        pump.fun
      </a>
      <a href={BRAND.chartUrl} target="_blank" rel="noreferrer">
        DexScreener
      </a>
      <a href={BRAND.solscanUrl} target="_blank" rel="noreferrer">
        Solscan
      </a>
      <span>Solana</span>
    </div>
  );
}
