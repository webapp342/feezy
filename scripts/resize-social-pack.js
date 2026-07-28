/**
 * Resize AI-generated masters in public/brand/social/masters/
 * into platform upload sizes. Does NOT invent art — only crops.
 * Run after AI assets are placed in masters/:
 *   node scripts/resize-social-pack.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT = path.join(process.cwd(), "public/brand/social");
const MASTERS = path.join(OUT, "masters");

const jobs = [
  ["x-avatar-ai.png", "x-avatar-400.png", 400, 400],
  ["x-avatar-ai.png", "tg-avatar-512.png", 512, 512],
  ["x-avatar-ai.png", "avatar-800.png", 800, 800],
  ["x-banner-ai.png", "x-banner-1500x500.png", 1500, 500, "banner"],
  ["x-post-launch-ai.png", "x-post-launch-1200x675.png", 1200, 675],
  ["x-post-square-ai.png", "x-post-launch-1080x1080.png", 1080, 1080],
  ["tg-welcome-ai.png", "tg-welcome-1280x720.png", 1280, 720],
  ["tg-welcome-square-ai.png", "tg-welcome-1080x1080.png", 1080, 1080],
];

async function run() {
  for (const job of jobs) {
    const [src, dest, w, h, mode] = job;
    const input = path.join(MASTERS, src);
    if (!fs.existsSync(input)) {
      console.warn("skip missing", src);
      continue;
    }
    const outPath = path.join(OUT, dest);
    if (mode === "banner") {
      const meta = await sharp(input).metadata();
      const { width, height } = meta;
      const cropH = Math.round((width ?? w) / 3);
      const maxTop = Math.max(0, (height ?? h) - cropH);
      const top = Math.round(maxTop * 0.12);
      await sharp(input)
        .extract({ left: 0, top, width: width ?? w, height: cropH })
        .resize(w, h, { fit: "fill" })
        .png()
        .toFile(outPath);
    } else {
      await sharp(input)
        .resize(w, h, { fit: "cover", position: "centre" })
        .png()
        .toFile(outPath);
    }
    console.log(dest);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
