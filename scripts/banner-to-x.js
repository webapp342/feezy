/**
 * Convert AI banner art to exact X header: 1500×500 (3:1).
 * Extracts a horizontal center band from the source (no squish).
 *
 * Usage:
 *   node scripts/banner-to-x.js <input.png> [output.png] [topBias 0-1]
 *
 * topBias: 0 = keep top, 0.5 = center, 1 = keep bottom (default 0.32 — preserves headline)
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const X_W = 1500;
const X_H = 500;

async function toXBanner(input, output, topBias = 0.32) {
  const meta = await sharp(input).metadata();
  const { width, height } = meta;
  if (!width || !height) throw new Error("Could not read image dimensions");

  const cropH = Math.round(width / 3);
  const maxTop = Math.max(0, height - cropH);
  const top = Math.round(maxTop * topBias);

  await sharp(input)
    .extract({ left: 0, top, width, height: cropH })
    .resize(X_W, X_H, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(output);

  const stat = fs.statSync(output);
  console.log(
    `${path.basename(input)} ${width}×${height} → extract y=${top} h=${cropH} → ${X_W}×${X_H} (${Math.round(stat.size / 1024)} KB)`,
  );
}

const input = process.argv[2];
const output =
  process.argv[3] ||
  path.join(process.cwd(), "public/brand/social/x-banner-1500x500.png");
const bias = Number(process.argv[4] ?? 0.32);

if (!input) {
  console.error(
    "Usage: node scripts/banner-to-x.js <input.png> [output.png] [topBias]",
  );
  process.exit(1);
}

toXBanner(input, output, bias).catch((e) => {
  console.error(e);
  process.exit(1);
});
