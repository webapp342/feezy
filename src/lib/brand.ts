/** Public brand config — Feezy v2 kit (charcoal fur, product GIFs). */

const MINT = "FeXWkSxjWKcj7qzSWjHnvryYrs6AxVztyrmc6gQTpump";
/** Bump when kit / opt assets change. */
const V = "9";

function asset(path: string) {
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
  creatorWallet:
    process.env.NEXT_PUBLIC_CREATOR_WALLET ||
    "F3Z961xu1uaBgLcyJZnXzmP4aJiyoFAqGPYiDrz7LMy5",
  xUrl: process.env.NEXT_PUBLIC_X_URL || "",
  telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL || "",
  referral: {
    xpEach: Number(process.env.NEXT_PUBLIC_REFERRAL_XP_EACH || 20000),
  },
  images: {
    logo: asset("/brand/opt/logo-96.webp"),
    logoLg: asset("/brand/opt/logo-192.webp"),
    mascot: asset("/brand/opt/sticker-point-160.webp"),
    hero: asset("/brand/kit/feezy-fee-drop.gif"),
    bounce: asset("/brand/kit/feezy-bounce.gif"),
    coin: asset("/brand/opt/coin-160.webp"),
    gifs: {
      feeDrop: asset("/brand/kit/feezy-fee-drop.gif"),
      eat: asset("/brand/kit/feezy-eat-loop.gif"),
      xp: asset("/brand/kit/feezy-xp-loop.gif"),
      timer: asset("/brand/kit/feezy-timer-loop.gif"),
    },
    stickers: {
      point: asset("/brand/opt/sticker-point-160.webp"),
      laugh: asset("/brand/opt/sticker-laugh-180.webp"),
      bags: asset("/brand/opt/sticker-bags-200.webp"),
      eat: asset("/brand/opt/eat-480.webp"),
      shush: asset("/brand/kit/feezy-sticker-shush.png"),
      timer: asset("/brand/kit/feezy-sticker-timer.png"),
      xp: asset("/brand/kit/feezy-sticker-xp.png"),
      logo: asset("/brand/opt/logo-96.webp"),
    },
    bg: asset("/brand/opt/bg-hero.webp"),
    markSvg: "/brand/kit/icons/feezy-mark.svg",
  },
} as const;

export function shortMint(mint: string = BRAND.mint): string {
  if (mint.length < 10) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
