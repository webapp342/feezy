/**
 * Process Feezy brand assets:
 * - flood-fill dark backdrops to alpha
 * - write canonical kit files
 * - build bounce GIF
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const ASSETS = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-DARK-Desktop-creator-fee-split/assets",
);
const KIT = path.join(ROOT, "public/brand/kit");
const BRAND = path.join(ROOT, "public/brand");

fs.mkdirSync(KIT, { recursive: true });
fs.mkdirSync(path.join(KIT, "icons"), { recursive: true });

function floodClearDark(rgba, w, h, threshold = 38, tol = 28) {
  const visited = new Uint8Array(w * h);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (visited[i]) return;
    const o = i * 4;
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    const a = rgba[o + 3];
    if (a < 8) {
      visited[i] = 1;
      return;
    }
    const lum = (r + g + b) / 3;
    // keep neon lime / gold / character greys — only clear near-black backdrop
    if (lum > threshold) return;
    // avoid clearing dark outline strokes deep inside: only flood from edges
    visited[i] = 1;
    rgba[o + 3] = 0;
    q.push(x, y);
  };

  // seed from all edge pixels that are dark
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (q.length) {
    const y = q.pop();
    const x = q.pop();
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = ny * w + nx;
      if (visited[i]) continue;
      const o = i * 4;
      const r = rgba[o];
      const g = rgba[o + 1];
      const b = rgba[o + 2];
      const lum = (r + g + b) / 3;
      // similar dark as backdrop (not mid-grey fur)
      if (lum <= threshold + tol && r < 70 && g < 70 && b < 70) {
        visited[i] = 1;
        rgba[o + 3] = 0;
        q.push(nx, ny);
      } else {
        visited[i] = 1; // stop at character edge
      }
    }
  }
  return rgba;
}

async function toTransparentPng(input, output, size = 1024) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = new Uint8ClampedArray(data);
  floodClearDark(rgba, info.width, info.height);

  await sharp(Buffer.from(rgba), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(output);

  console.log("wrote", path.relative(ROOT, output));
}

async function buildGif(frames, output) {
  // gifenc ESM — use dynamic import
  const gifenc = await import("gifenc");
  const { GIFEncoder, quantize, applyPalette } = gifenc.default || gifenc;
  const gif = GIFEncoder();
  let w = 0;
  let h = 0;
  for (const framePath of frames) {
    const { data, info } = await sharp(framePath)
      .ensureAlpha()
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer({ resolveWithObject: true });
    w = info.width;
    h = info.height;
    const rgba = new Uint8ClampedArray(data);
    floodClearDark(rgba, w, h);
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, w, h, { palette, delay: 180, transparent: true });
  }
  gif.finish();
  fs.writeFileSync(output, Buffer.from(gif.bytes()));
  console.log("wrote", path.relative(ROOT, output));
}

async function main() {
  const map = [
    ["feezy-canonical-logo.png", "feezy-canonical-logo.png", 768],
    ["feezy-mascot.png", "feezy-mascot.png", 1024],
    ["feezy-coin.png", "feezy-coin.png", 768],
    ["feezy-sticker.png", "feezy-sticker.png", 768],
    ["feezy-bounce-up.png", "feezy-bounce-up.png", 768],
    ["feezy-bounce-down.png", "feezy-bounce-down.png", 768],
  ];

  for (const [srcName, outName, size] of map) {
    const src = path.join(ASSETS, srcName);
    if (!fs.existsSync(src)) {
      console.warn("missing", src);
      continue;
    }
    await toTransparentPng(src, path.join(KIT, outName), size);
  }

  // also publish primary aliases used by site
  fs.copyFileSync(path.join(KIT, "feezy-canonical-logo.png"), path.join(BRAND, "feezy-logo.png"));
  fs.copyFileSync(path.join(KIT, "feezy-mascot.png"), path.join(BRAND, "feezy-hero.png"));
  fs.copyFileSync(path.join(KIT, "feezy-mascot.png"), path.join(KIT, "feezy-mascot-idle.png"));

  const bounceFrames = [
    path.join(KIT, "feezy-bounce-down.png"),
    path.join(KIT, "feezy-mascot.png"),
    path.join(KIT, "feezy-bounce-up.png"),
    path.join(KIT, "feezy-mascot.png"),
  ].filter(fs.existsSync);

  if (bounceFrames.length >= 2) {
    await buildGif(bounceFrames, path.join(KIT, "feezy-bounce.gif"));
    fs.copyFileSync(path.join(KIT, "feezy-bounce.gif"), path.join(BRAND, "feezy-bounce.gif"));
  }

  // keep purple bg for hero backdrop only
  console.log("kit ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
