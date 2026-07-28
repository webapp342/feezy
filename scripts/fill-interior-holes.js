/**
 * Fill interior transparent holes so page background can't bleed through fur.
 * Exterior (border-connected) transparency is kept.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const KIT = path.join(process.cwd(), "public/brand/kit");
const BRAND = path.join(process.cwd(), "public/brand");

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

  // Collect hole pixels
  const holes = [];
  for (let i = 0; i < N; i++) {
    if (rgba[i * 4 + 3] === 0 && !exterior[i]) holes.push(i);
  }
  if (!holes.length) return 0;

  // For each hole, sample nearest opaque neighbors (search ring)
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

  for (const i of holes) {
    const x0 = i % w;
    const y0 = (i / w) | 0;
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;

    for (let rad = 1; rad <= 12 && n < 8; rad++) {
      for (const [dx, dy] of dirs) {
        for (let k = -rad; k <= rad; k++) {
          const samples =
            dy === 0
              ? [[x0 + dx * rad, y0 + k]]
              : dx === 0
                ? [[x0 + k, y0 + dy * rad]]
                : [
                    [x0 + dx * rad, y0 + dy * rad],
                    [x0 + dx * rad, y0 + k],
                    [x0 + k, y0 + dy * rad],
                  ];
          for (const [x, y] of samples) {
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            const j = y * w + x;
            const o = j * 4;
            if (rgba[o + 3] < 200) continue;
            // skip neon lime / gold accents — prefer dark fill for fur holes
            const r = rgba[o];
            const g = rgba[o + 1];
            const b = rgba[o + 2];
            const lum = (r + g + b) / 3;
            // prefer charcoal neighbors for face holes
            const weight = lum < 140 ? 3 : lum < 200 ? 1 : 0.15;
            sr += r * weight;
            sg += g * weight;
            sb += b * weight;
            n += weight;
            if (n >= 12) break;
          }
          if (n >= 12) break;
        }
        if (n >= 12) break;
      }
    }

    const o = i * 4;
    if (n > 0) {
      rgba[o] = Math.round(sr / n);
      rgba[o + 1] = Math.round(sg / n);
      rgba[o + 2] = Math.round(sb / n);
    } else {
      // fallback charcoal
      rgba[o] = 28;
      rgba[o + 1] = 28;
      rgba[o + 2] = 28;
    }
    rgba[o + 3] = 255;
  }

  // Force dark pixels fully opaque + neutral (belt and suspenders)
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (rgba[o + 3] === 0) continue;
    if (rgba[o + 3] < 255 && rgba[o + 3] > 0) {
      // rare semis — make solid
      rgba[o + 3] = 255;
    }
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    const lum = (r + g + b) / 3;
    if (lum < 110) {
      const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      rgba[o] = grey;
      rgba[o + 1] = grey;
      rgba[o + 2] = grey;
    }
  }

  return holes.length;
}

async function fixFile(file) {
  const p = path.join(KIT, file);
  const { data, info } = await sharp(p)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = new Uint8ClampedArray(data);
  const filled = fillInteriorHoles(rgba, info.width, info.height);
  await sharp(Buffer.from(rgba), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 6 })
    .toFile(p);
  console.log("filled", file, filled, "holes");
}

async function buildGif(frames, output, size = 512, delay = 200) {
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
    // also fill holes on resized frames
    fillInteriorHoles(rgba, info.width, info.height);
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 20) {
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
  console.log("gif", path.basename(output));
}

async function main() {
  const files = fs
    .readdirSync(KIT)
    .filter((f) => f.endsWith(".png") && !f.startsWith("_"));
  for (const f of files) await fixFile(f);

  // sync brand copies
  fs.copyFileSync(
    path.join(KIT, "feezy-canonical-logo.png"),
    path.join(BRAND, "feezy-logo.png"),
  );
  fs.copyFileSync(
    path.join(KIT, "feezy-mascot.png"),
    path.join(BRAND, "feezy-hero.png"),
  );

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
  fs.copyFileSync(
    path.join(KIT, "feezy-fee-drop.gif"),
    path.join(BRAND, "feezy-fee-drop.gif"),
  );

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
  fs.copyFileSync(
    path.join(KIT, "feezy-bounce.gif"),
    path.join(BRAND, "feezy-bounce.gif"),
  );

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

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
