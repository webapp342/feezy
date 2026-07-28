/**
 * Pack AI social masters into platform sizes + avatar safe padding for circular crop.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ASSETS =
  "C:/Users/DARK/.cursor/projects/c-Users-DARK-Desktop-creator-fee-split/assets";
const OUT = path.join(process.cwd(), "public/brand/social");
const MASTERS = path.join(OUT, "masters");
const PURPLE = { r: 20, g: 0, b: 43, alpha: 1 };

async function avatarSafe(src, dest, size) {
  // Keep subject inside circular crop: ~72% of frame, centered on brand purple
  const inner = Math.round(size * 0.72);
  const pad = Math.round((size - inner) / 2);
  const resized = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: PURPLE })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: PURPLE },
  })
    .composite([{ input: resized, left: pad, top: pad }])
    .png()
    .toFile(dest);
}

async function resizeCover(src, dest, w, h) {
  await sharp(src).resize(w, h, { fit: "cover", position: "centre" }).png().toFile(dest);
}

async function main() {
  fs.mkdirSync(MASTERS, { recursive: true });

  const avatarSrc = path.join(ASSETS, "avatar-feezy-safe.png");
  fs.copyFileSync(avatarSrc, path.join(MASTERS, "avatar-feezy-safe.png"));
  await avatarSafe(avatarSrc, path.join(OUT, "x-avatar-400.png"), 400);
  await avatarSafe(avatarSrc, path.join(OUT, "tg-avatar-512.png"), 512);
  await avatarSafe(avatarSrc, path.join(OUT, "avatar-800.png"), 800);

  const jobs = [
    ["tg-welcome-pro.png", "tg-welcome-1280x720.png", 1280, 720],
    ["tg-welcome-pro.png", "tg-welcome-1080x1080.png", 1080, 1080],
    ["x-post-01-fees.png", "x-post-01-fees-1200x675.png", 1200, 675],
    ["x-post-02-snapshots.png", "x-post-02-snapshots-1200x675.png", 1200, 675],
    ["x-post-03-xp.png", "x-post-03-xp-1200x675.png", 1200, 675],
    ["x-post-04-howto.png", "x-post-04-howto-1200x675.png", 1200, 675],
    ["x-post-05-cta.png", "x-post-05-cta-1080x1080.png", 1080, 1080],
  ];

  for (const [srcName, destName, w, h] of jobs) {
    const src = path.join(ASSETS, srcName);
    if (!fs.existsSync(src)) {
      console.warn("missing", srcName);
      continue;
    }
    fs.copyFileSync(src, path.join(MASTERS, srcName));
    await resizeCover(src, path.join(OUT, destName), w, h);
    console.log(destName);
  }

  console.log("avatars ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
