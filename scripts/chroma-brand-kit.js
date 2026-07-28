/**
 * Rebuild Feezy v2 kit from magenta sources (charcoal fur, no purple).
 * Hero GIF = creator fee drop catch loop (product-related motion).
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

function isMagenta(r, g, b) {
  return r > 145 && b > 145 && g < 155 && r + b > g * 2.0;
}

function isChecker(r, g, b) {
  const near = (x, y) => Math.abs(x - y) < 28;
  if (!(near(r, g) && near(g, b))) return false;
  const lum = (r + g + b) / 3;
  return (lum > 160 && lum < 230) || (lum > 90 && lum < 150);
}

function neutralize(rgba, w, h) {
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (rgba[o + 3] < 12) continue;
    let r = rgba[o];
    let g = rgba[o + 1];
    let b = rgba[o + 2];

    // magenta spill
    if (r > g + 8 && b > g + 8) {
      const s = Math.min(r - g, b - g);
      r = Math.max(0, r - s * 0.9);
      b = Math.max(0, b - s * 0.9);
    }

    const lum = (r + g + b) / 3;
    // dark fur → pure neutral charcoal
    if (lum < 105) {
      const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      r = g = b = grey;
    } else if (lum < 150 && (b > g + 5 || b > r + 5)) {
      const grey = Math.round((r + g + b) / 3);
      const t = 0.75;
      r = Math.round(r * (1 - t) + grey * t);
      g = Math.round(g * (1 - t) + grey * t);
      b = Math.round(b * (1 - t) + grey * t);
    }

    rgba[o] = r;
    rgba[o + 1] = g;
    rgba[o + 2] = b;
  }
}

function keyRgba(rgba, w, h) {
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    if (isMagenta(r, g, b) || isChecker(r, g, b)) {
      rgba[o + 3] = 0;
    } else if (r > 130 && b > 130 && g < 175) {
      const spill = Math.min(r, b) - g;
      if (spill > 12) {
        rgba[o] = Math.max(0, r - spill * 0.8);
        rgba[o + 2] = Math.max(0, b - spill * 0.8);
      }
    }
  }

  const visited = new Uint8Array(w * h);
  const q = [];
  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (visited[i]) return;
    visited[i] = 1;
    const o = i * 4;
    if (rgba[o + 3] === 0) {
      q.push(x, y);
      return;
    }
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    if (isMagenta(r, g, b) || isChecker(r, g, b) || (r > 185 && b > 185 && g < 155)) {
      rgba[o + 3] = 0;
      q.push(x, y);
    }
  };
  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }
  while (q.length) {
    const y = q.pop();
    const x = q.pop();
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = ny * w + nx;
      if (visited[i]) continue;
      visited[i] = 1;
      const o = i * 4;
      const r = rgba[o];
      const g = rgba[o + 1];
      const b = rgba[o + 2];
      if (rgba[o + 3] === 0 || isMagenta(r, g, b) || isChecker(r, g, b)) {
        rgba[o + 3] = 0;
        q.push(nx, ny);
      }
    }
  }

  neutralize(rgba, w, h);
  fillInteriorHoles(rgba, w, h);
  return rgba;
}

/** Interior transparent holes (not border-connected) get filled so bg can't bleed. */
function fillInteriorHoles(rgba, w, h) {
  const N = w * h;
  const exterior = new Uint8Array(N);
  const q = [];
  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (exterior[i]) return;
    if (rgba[i * 4 + 3] !== 0) return;
    exterior[i] = 1;
    q.push(i);
  };
  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }
  while (q.length) {
    const i = q.pop();
    const x = i % w;
    const y = (i / w) | 0;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (let i = 0; i < N; i++) {
    if (rgba[i * 4 + 3] !== 0 || exterior[i]) continue;
    const x0 = i % w;
    const y0 = (i / w) | 0;
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    for (let rad = 1; rad <= 10 && n < 8; rad++) {
      for (const [dx, dy] of dirs) {
        const x = x0 + dx * rad;
        const y = y0 + dy * rad;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const o = (y * w + x) * 4;
        if (rgba[o + 3] < 200) continue;
        const r = rgba[o];
        const g = rgba[o + 1];
        const b = rgba[o + 2];
        const lum = (r + g + b) / 3;
        const weight = lum < 140 ? 3 : 1;
        sr += r * weight;
        sg += g * weight;
        sb += b * weight;
        n += weight;
      }
    }
    const o = i * 4;
    if (n > 0) {
      rgba[o] = Math.round(sr / n);
      rgba[o + 1] = Math.round(sg / n);
      rgba[o + 2] = Math.round(sb / n);
    } else {
      rgba[o] = 28;
      rgba[o + 1] = 28;
      rgba[o + 2] = 28;
    }
    rgba[o + 3] = 255;
  }
}

async function chroma(input, output, size = 1024) {
  if (!fs.existsSync(input)) {
    console.warn("missing", path.basename(input));
    return false;
  }
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 0, b: 255, alpha: 1 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = keyRgba(new Uint8ClampedArray(data), info.width, info.height);
  await sharp(Buffer.from(rgba), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 6 })
    .toFile(output);
  console.log("ok", path.relative(ROOT, output), `${(fs.statSync(output).size / 1024) | 0}KB`);
  return true;
}

async function buildGif(frames, output, size = 512, delay = 180) {
  const gifenc = await import("gifenc");
  const { GIFEncoder, quantize, applyPalette } = gifenc.default || gifenc;
  const gif = GIFEncoder();
  for (const framePath of frames) {
    if (!fs.existsSync(framePath)) continue;
    const { data, info } = await sharp(framePath)
      .ensureAlpha()
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = new Uint8ClampedArray(data);
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 24) {
        rgba[i - 3] = 0;
        rgba[i - 2] = 0;
        rgba[i - 1] = 0;
        rgba[i] = 0;
      }
    }
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    let transparentIndex = 0;
    for (let i = 0; i < palette.length; i++) {
      const [r, g, b] = palette[i];
      if (r + g + b === 0) {
        transparentIndex = i;
        break;
      }
    }
    gif.writeFrame(index, info.width, info.height, {
      palette,
      delay,
      transparent: true,
      transparentIndex,
    });
  }
  gif.finish();
  fs.writeFileSync(output, Buffer.from(gif.bytes()));
  console.log("ok gif", path.relative(ROOT, output), `${(fs.statSync(output).size / 1024) | 0}KB`);
}

function cp(from, to) {
  fs.copyFileSync(from, to);
}

async function main() {
  const jobs = [
    ["feezy-v2-logo-magenta.png", "feezy-canonical-logo.png", 768],
    ["feezy-v2-point-magenta.png", "feezy-sticker-point.png", 900],
    ["feezy-v2-point-magenta.png", "feezy-mascot.png", 1024],
    ["feezy-v2-laugh-magenta.png", "feezy-sticker-laugh.png", 768],
    ["feezy-v2-bags-magenta.png", "feezy-sticker-bags.png", 900],
    ["feezy-v2-eat-magenta.png", "feezy-sticker-eat.png", 900],
    ["feezy-v2-shush-magenta.png", "feezy-sticker-shush.png", 768],
    ["feezy-v2-timer-magenta.png", "feezy-sticker-timer.png", 900],
    ["feezy-v2-xp-magenta.png", "feezy-sticker-xp.png", 900],
    ["feezy-v2-coin-magenta.png", "feezy-coin.png", 768],
    ["feezy-v2-drop-a-magenta.png", "feezy-drop-a.png", 900],
    ["feezy-v2-drop-b-magenta.png", "feezy-drop-b.png", 900],
    ["feezy-v2-drop-c-magenta.png", "feezy-drop-c.png", 900],
  ];

  for (const [src, out, size] of jobs) {
    await chroma(path.join(ASSETS, src), path.join(KIT, out), size);
  }

  // aliases
  const aliases = [
    ["feezy-canonical-logo.png", "feezy-logo.png"],
    ["feezy-sticker-point.png", "feezy-sticker.png"],
    ["feezy-sticker-point.png", "feezy-point.png"],
    ["feezy-sticker-laugh.png", "feezy-laugh.png"],
    ["feezy-sticker-bags.png", "feezy-bags.png"],
    ["feezy-sticker-eat.png", "feezy-eat.png"],
    ["feezy-sticker-shush.png", "feezy-distribute.png"],
    ["feezy-sticker-timer.png", "feezy-clock.png"],
    ["feezy-sticker-xp.png", "feezy-xp.png"],
    ["feezy-mascot.png", "feezy-mascot-idle.png"],
  ];
  for (const [from, to] of aliases) {
    cp(path.join(KIT, from), path.join(KIT, to));
  }
  cp(path.join(KIT, "feezy-canonical-logo.png"), path.join(BRAND, "feezy-logo.png"));
  cp(path.join(KIT, "feezy-mascot.png"), path.join(BRAND, "feezy-hero.png"));

  // Product GIF: random fee drop → catch → celebrate
  await buildGif(
    [
      path.join(KIT, "feezy-drop-a.png"),
      path.join(KIT, "feezy-drop-b.png"),
      path.join(KIT, "feezy-drop-c.png"),
      path.join(KIT, "feezy-drop-b.png"),
    ],
    path.join(KIT, "feezy-fee-drop.gif"),
    560,
    200,
  );
  cp(path.join(KIT, "feezy-fee-drop.gif"), path.join(BRAND, "feezy-fee-drop.gif"));

  // Bounce hero fallback from drop + point
  await buildGif(
    [
      path.join(KIT, "feezy-sticker-point.png"),
      path.join(KIT, "feezy-drop-b.png"),
      path.join(KIT, "feezy-sticker-point.png"),
      path.join(KIT, "feezy-drop-a.png"),
    ],
    path.join(KIT, "feezy-bounce.gif"),
    512,
    160,
  );
  cp(path.join(KIT, "feezy-bounce.gif"), path.join(BRAND, "feezy-bounce.gif"));

  // Eat pulse: eat + drop celebrate
  await buildGif(
    [
      path.join(KIT, "feezy-sticker-eat.png"),
      path.join(KIT, "feezy-drop-c.png"),
      path.join(KIT, "feezy-sticker-eat.png"),
    ],
    path.join(KIT, "feezy-eat-loop.gif"),
    480,
    220,
  );

  // XP hustle loop
  await buildGif(
    [
      path.join(KIT, "feezy-sticker-xp.png"),
      path.join(KIT, "feezy-sticker-bags.png"),
      path.join(KIT, "feezy-sticker-xp.png"),
    ],
    path.join(KIT, "feezy-xp-loop.gif"),
    420,
    240,
  );

  // Timer tick loop
  await buildGif(
    [
      path.join(KIT, "feezy-sticker-timer.png"),
      path.join(KIT, "feezy-sticker-shush.png"),
      path.join(KIT, "feezy-sticker-timer.png"),
    ],
    path.join(KIT, "feezy-timer-loop.gif"),
    420,
    260,
  );

  console.log("done v2 kit");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
