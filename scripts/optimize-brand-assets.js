/**
 * Generate lightweight WebP assets for production (run: node scripts/optimize-brand-assets.js)
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public/brand/opt");

const jobs = [
  {
    in: "public/brand/feezy-bg-hero.png",
    out: "bg-hero.webp",
    w: 1600,
    q: 72,
  },
  {
    in: "public/brand/kit/feezy-canonical-logo.png",
    out: "logo-96.webp",
    w: 96,
    q: 82,
  },
  {
    in: "public/brand/kit/feezy-canonical-logo.png",
    out: "logo-192.webp",
    w: 192,
    q: 82,
  },
  {
    in: "public/brand/kit/feezy-canonical-logo.png",
    out: "logo-480.webp",
    w: 480,
    q: 84,
  },
  {
    in: "public/brand/kit/feezy-coin.png",
    out: "coin-160.webp",
    w: 160,
    q: 80,
  },
  {
    in: "public/brand/kit/feezy-sticker-laugh.png",
    out: "sticker-laugh-180.webp",
    w: 180,
    q: 78,
  },
  {
    in: "public/brand/kit/feezy-sticker-point.png",
    out: "sticker-point-160.webp",
    w: 160,
    q: 78,
  },
  {
    in: "public/brand/kit/feezy-sticker-bags.png",
    out: "sticker-bags-200.webp",
    w: 200,
    q: 78,
  },
  {
    in: "public/brand/kit/feezy-eat.png",
    out: "eat-480.webp",
    w: 480,
    q: 78,
  },
  {
    in: "public/brand/kit/feezy-mascot-idle.png",
    out: "mascot-320.webp",
    w: 320,
    q: 78,
  },
];

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const job of jobs) {
    const src = path.join(ROOT, job.in);
    if (!fs.existsSync(src)) {
      console.warn("skip missing", job.in);
      continue;
    }
    const dest = path.join(OUT, job.out);
    await sharp(src)
      .resize(job.w, job.w, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: job.q, effort: 4 })
      .toFile(dest);
    const kb = (fs.statSync(dest).size / 1024).toFixed(1);
    console.log(`${job.out} ${kb} KB`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
