/** Public brand config — Feezy v2 kit (charcoal fur, product GIFs). */

const MINT = "FeXWkSxjWKcj7qzSWjHnvryYrs6AxVztyrmc6gQTpump";
/** Bump when kit assets change. */
const V = "8";

function kit(path: string) {
  return `${path}?v=${V}`;
}

export const BRAND = {
  symbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL || "FEEZY",
  name: process.env.NEXT_PUBLIC_TOKEN_NAME || "Feezy",
  tagline: "Creator fees get eaten. Holders get paid.",
  mint: process.env.NEXT_PUBLIC_TOKEN_MINT || MINT,
  buyUrl: process.env.NEXT_PUBLIC_BUY_URL || `https://pump.fun/coin/${MINT}`,
  chartUrl:
    process.env.NEXT_PUBLIC_CHART_URL ||
    `https://dexscreener.com/solana/${MINT}`,
  solscanUrl: `https://solscan.io/token/${MINT}`,
  xUrl: process.env.NEXT_PUBLIC_X_URL || "",
  telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL || "",
  images: {
    logo: kit("/brand/kit/feezy-canonical-logo.png"),
    mascot: kit("/brand/kit/feezy-sticker-point.png"),
    /** Product motion: random fee drop → catch → celebrate */
    hero: kit("/brand/kit/feezy-fee-drop.gif"),
    bounce: kit("/brand/kit/feezy-bounce.gif"),
    coin: kit("/brand/kit/feezy-coin.png"),
    gifs: {
      feeDrop: kit("/brand/kit/feezy-fee-drop.gif"),
      eat: kit("/brand/kit/feezy-eat-loop.gif"),
      xp: kit("/brand/kit/feezy-xp-loop.gif"),
      timer: kit("/brand/kit/feezy-timer-loop.gif"),
    },
    stickers: {
      point: kit("/brand/kit/feezy-sticker-point.png"),
      laugh: kit("/brand/kit/feezy-sticker-laugh.png"),
      bags: kit("/brand/kit/feezy-sticker-bags.png"),
      eat: kit("/brand/kit/feezy-sticker-eat.png"),
      shush: kit("/brand/kit/feezy-sticker-shush.png"),
      timer: kit("/brand/kit/feezy-sticker-timer.png"),
      xp: kit("/brand/kit/feezy-sticker-xp.png"),
      logo: kit("/brand/kit/feezy-canonical-logo.png"),
    },
    bg: kit("/brand/feezy-bg-hero.png"),
    markSvg: "/brand/kit/icons/feezy-mark.svg",
  },
} as const;

export function shortMint(mint: string = BRAND.mint): string {
  if (mint.length < 10) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
