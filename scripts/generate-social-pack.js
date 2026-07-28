/**
 * Generate X + Telegram launch assets at platform sizes.
 * Run: node scripts/generate-social-pack.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public/brand/social");
const KIT = path.join(ROOT, "public/brand/kit");
const BRAND = path.join(ROOT, "public/brand");

const FONT_DISPLAY = "C:/Windows/Fonts/ariblk.ttf";
const FONT_BODY = "C:/Windows/Fonts/segoeuib.ttf";
const FONT_REG = "C:/Windows/Fonts/segoeui.ttf";

const COLORS = {
  purpleDeep: "#14002B",
  purple: "#6A00E6",
  yellow: "#FFE600",
  lime: "#C8FF00",
  ink: "#FFFFFF",
  muted: "#C9B8E8",
};

function fontFace(name, file) {
  const b64 = fs.readFileSync(file).toString("base64");
  return `@font-face{font-family:'${name}';src:url('data:font/ttf;base64,${b64}') format('truetype');}`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function writePng(name, pipeline) {
  const dest = path.join(OUT, name);
  await pipeline.png({ compressionLevel: 8 }).toFile(dest);
  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`✓ ${name}  ${kb} KB`);
}

async function avatar(size, name) {
  const src = path.join(KIT, "feezy-canonical-logo.png");
  await writePng(
    name,
    sharp(src)
      .resize(size, size, { fit: "cover" })
      .flatten({ background: COLORS.purpleDeep }),
  );
}

async function xBanner() {
  const W = 1500;
  const H = 500;
  const bg = await sharp(path.join(BRAND, "feezy-bg-hero.png"))
    .resize(W, H, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.72, saturation: 1.15 })
    .toBuffer();

  const mascot = await sharp(path.join(KIT, "feezy-mascot.png"))
    .resize(430, 430, { fit: "inside" })
    .toBuffer();

  // Safe zone: X avatar covers bottom-left (~280px). Keep copy center-left, CTA above crop.
  const overlay = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      ${fontFace("FeezyDisplay", FONT_DISPLAY)}
      ${fontFace("FeezyBody", FONT_BODY)}
      ${fontFace("FeezyReg", FONT_REG)}
    </style>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#14002B" stop-opacity="0.88"/>
      <stop offset="55%" stop-color="#14002B" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#14002B" stop-opacity="0.12"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#shade)"/>
  <text x="320" y="150" font-family="FeezyDisplay" font-size="88" fill="${COLORS.yellow}">$FEEZY</text>
  <text x="324" y="210" font-family="FeezyBody" font-size="30" fill="${COLORS.ink}">Creator fees get eaten. Holders get paid.</text>
  <text x="324" y="262" font-family="FeezyReg" font-size="24" fill="${COLORS.muted}">3× daily random snapshots  ·  XP-weighted fee drops</text>
  <rect x="324" y="300" rx="999" ry="999" width="268" height="52" fill="${COLORS.yellow}"/>
  <text x="458" y="335" text-anchor="middle" font-family="FeezyBody" font-size="22" fill="#14002B">LIVE ON SOLANA</text>
</svg>`);

  await writePng(
    "x-banner-1500x500.png",
    sharp(bg)
      .composite([
        { input: mascot, left: 1020, top: 40 },
        { input: overlay, left: 0, top: 0 },
      ]),
  );
}

async function postCard({
  name,
  w,
  h,
  title,
  subtitle,
  line,
  badge,
  mascotFile,
  mascotW,
}) {
  const bg = await sharp(path.join(BRAND, "feezy-bg-hero.png"))
    .resize(w, h, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.68, saturation: 1.2 })
    .toBuffer();

  const mascot = await sharp(path.join(KIT, mascotFile))
    .resize(mascotW, mascotW, { fit: "inside" })
    .toBuffer();

  const mx = Math.round(w * 0.52);
  const my = Math.round((h - mascotW) / 2 + h * 0.02);

  const overlay = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      ${fontFace("FeezyDisplay", FONT_DISPLAY)}
      ${fontFace("FeezyBody", FONT_BODY)}
      ${fontFace("FeezyReg", FONT_REG)}
    </style>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#14002B" stop-opacity="0.94"/>
      <stop offset="48%" stop-color="#14002B" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="#14002B" stop-opacity="0.18"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#shade)"/>
  <text x="${Math.round(w * 0.055)}" y="${Math.round(h * 0.22)}" font-family="FeezyBody" font-size="${Math.round(h * 0.045)}" fill="${COLORS.lime}" letter-spacing="3">${esc(badge)}</text>
  <text x="${Math.round(w * 0.055)}" y="${Math.round(h * 0.42)}" font-family="FeezyDisplay" font-size="${Math.round(h * 0.14)}" fill="${COLORS.yellow}">${esc(title)}</text>
  <text x="${Math.round(w * 0.055)}" y="${Math.round(h * 0.55)}" font-family="FeezyBody" font-size="${Math.round(h * 0.055)}" fill="${COLORS.ink}">${esc(subtitle)}</text>
  <text x="${Math.round(w * 0.055)}" y="${Math.round(h * 0.68)}" font-family="FeezyReg" font-size="${Math.round(h * 0.04)}" fill="${COLORS.muted}">${esc(line)}</text>
  <rect x="${Math.round(w * 0.055)}" y="${Math.round(h * 0.78)}" rx="999" ry="999" width="${Math.round(w * 0.28)}" height="${Math.round(h * 0.09)}" fill="${COLORS.yellow}"/>
  <text x="${Math.round(w * 0.195)}" y="${Math.round(h * 0.842)}" text-anchor="middle" font-family="FeezyBody" font-size="${Math.round(h * 0.038)}" fill="#14002B">BUY · EARN · HOLD</text>
</svg>`);

  await writePng(
    name,
    sharp(bg).composite([
      { input: mascot, left: mx, top: Math.max(0, my) },
      { input: overlay, left: 0, top: 0 },
    ]),
  );
}

async function tgWelcome() {
  // Telegram first group/channel post — landscape card (compresses well)
  const W = 1280;
  const H = 720;
  const bg = await sharp(path.join(BRAND, "feezy-bg-hero.png"))
    .resize(W, H, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.65, saturation: 1.18 })
    .toBuffer();

  const mascot = await sharp(path.join(KIT, "feezy-eat.png"))
    .resize(560, 560, { fit: "inside" })
    .toBuffer();

  const overlay = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      ${fontFace("FeezyDisplay", FONT_DISPLAY)}
      ${fontFace("FeezyBody", FONT_BODY)}
      ${fontFace("FeezyReg", FONT_REG)}
    </style>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#14002B" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#14002B" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#14002B" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#shade)"/>
  <text x="64" y="120" font-family="FeezyBody" font-size="28" fill="${COLORS.lime}" letter-spacing="4">OFFICIAL GROUP</text>
  <text x="64" y="230" font-family="FeezyDisplay" font-size="96" fill="${COLORS.yellow}">WELCOME TO</text>
  <text x="64" y="340" font-family="FeezyDisplay" font-size="110" fill="${COLORS.yellow}">$FEEZY</text>
  <text x="64" y="420" font-family="FeezyBody" font-size="32" fill="${COLORS.ink}">Creator fees → holders</text>
  <text x="64" y="480" font-family="FeezyReg" font-size="26" fill="${COLORS.muted}">3× daily random snapshots · XP-weighted payouts</text>
  <text x="64" y="530" font-family="FeezyReg" font-size="24" fill="${COLORS.muted}">Always verify CA · Admins never DM first</text>
  <rect x="64" y="580" rx="999" ry="999" width="320" height="58" fill="${COLORS.yellow}"/>
  <text x="224" y="619" text-anchor="middle" font-family="FeezyBody" font-size="24" fill="#14002B">JOIN · BUY · EARN</text>
</svg>`);

  await writePng(
    "tg-welcome-1280x720.png",
    sharp(bg).composite([
      { input: mascot, left: 700, top: 90 },
      { input: overlay, left: 0, top: 0 },
    ]),
  );
}

async function tgWelcomeSquare() {
  // Square variant for mobile-first TG posts
  const S = 1080;
  const bg = await sharp(path.join(BRAND, "feezy-bg-hero.png"))
    .resize(S, S, { fit: "cover", position: "centre" })
    .modulate({ brightness: 0.62, saturation: 1.2 })
    .toBuffer();

  const mascot = await sharp(path.join(KIT, "feezy-eat.png"))
    .resize(520, 520, { fit: "inside" })
    .toBuffer();

  const overlay = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      ${fontFace("FeezyDisplay", FONT_DISPLAY)}
      ${fontFace("FeezyBody", FONT_BODY)}
      ${fontFace("FeezyReg", FONT_REG)}
    </style>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#14002B" stop-opacity="0.35"/>
      <stop offset="45%" stop-color="#14002B" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#14002B" stop-opacity="0.94"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#shade)"/>
  <text x="540" y="700" text-anchor="middle" font-family="FeezyBody" font-size="28" fill="${COLORS.lime}" letter-spacing="4">OFFICIAL TELEGRAM</text>
  <text x="540" y="800" text-anchor="middle" font-family="FeezyDisplay" font-size="92" fill="${COLORS.yellow}">$FEEZY</text>
  <text x="540" y="870" text-anchor="middle" font-family="FeezyBody" font-size="30" fill="${COLORS.ink}">Creator fees get eaten. Holders get paid.</text>
  <text x="540" y="930" text-anchor="middle" font-family="FeezyReg" font-size="24" fill="${COLORS.muted}">3× daily · XP-weighted · verify CA</text>
</svg>`);

  await writePng(
    "tg-welcome-1080x1080.png",
    sharp(bg).composite([
      { input: mascot, left: 280, top: 80 },
      { input: overlay, left: 0, top: 0 },
    ]),
  );
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log("Generating social pack → public/brand/social/\n");

  // Profiles
  await avatar(400, "x-avatar-400.png");
  await avatar(512, "tg-avatar-512.png");
  await avatar(800, "avatar-800.png"); // high-res source for both

  // X header
  await xBanner();

  // X first posts
  await postCard({
    name: "x-post-launch-1200x675.png",
    w: 1200,
    h: 675,
    title: "$FEEZY",
    subtitle: "Creator fees → holders",
    line: "3× daily random snapshots · XP-weighted",
    badge: "LIVE ON SOLANA",
    mascotFile: "feezy-mascot.png",
    mascotW: 520,
  });

  await postCard({
    name: "x-post-launch-1080x1080.png",
    w: 1080,
    h: 1080,
    title: "$FEEZY",
    subtitle: "Creator fees → holders",
    line: "3× daily random · XP-weighted drops",
    badge: "LIVE ON SOLANA",
    mascotFile: "feezy-sticker-bags.png",
    mascotW: 560,
  });

  // Telegram first group message
  await tgWelcome();
  await tgWelcomeSquare();

  console.log("\nDone. Upload guide:");
  console.log("  X avatar:     x-avatar-400.png");
  console.log("  X banner:     x-banner-1500x500.png");
  console.log("  X post:       x-post-launch-1200x675.png (or 1080 square)");
  console.log("  TG avatar:    tg-avatar-512.png");
  console.log("  TG first msg: tg-welcome-1280x720.png");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
