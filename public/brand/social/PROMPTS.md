# Social art prompts (character-locked)

Always attach references:
- `public/brand/kit/feezy-canonical-logo.png`
- relevant pose: `feezy-mascot.png` / `feezy-eat.png` / `feezy-sticker-bags.png` / `feezy-coin.png`

Seed DNA (prepend every prompt):
```
Same character as FEEZY canonical logo: raccoon mascot, neon lime mohawk and cheek tips, gold oval sunglasses low on nose, neon green eyes, smirk with one gold tooth, thick black outlines, clean vector cell-shade. No other crypto logos. Consistent face proportions every time.
```

## X avatar (1:1)
```
Square profile avatar. Close-up head portrait of Feezy only. Solid deep purple #14002B background. Centered for circular crop. No text, no props, no full body.
```

## X banner (1500×500 native — 3:1)
```
Exact X header canvas 1500×500 pixels, 3:1 aspect ratio. NOT 16:9.

SAFE ZONES (critical):
- Bottom-left ~400×220px: EMPTY — only nebula/stars (profile avatar overlaps here on desktop)
- Top 55px + bottom 55px: bleed only, no text
- Safe content band: center-right (~x 250–1400, y 60–380)

Layout: $FEEZY headline upper-left (above avatar zone), taglines mid-left, Feezy full body RIGHT third pointing at text. Shallow horizontal composition — one wide row, not tall scene.

After AI: node scripts/banner-to-x.js public/brand/social/masters/x-banner-ai.png
(Do NOT use resize-social-pack centre crop for banner.)
```

## X launch post (16:9)
```
Feezy on RIGHT catching raining gold Feezy-face coins. Left side open purple space. Fee drop celebration mood. No text overlays.
```

## X launch square (1:1)
```
Centered Feezy cool pose with money bags / Feezy coins. Deep purple BG. No text overlays.
```

## TG welcome landscape (16:9)
```
Feezy sitting on pile of Feezy-face gold coins biting a coin. Dark purple cosmic BG. No text overlays.
```

## TG welcome square (1:1)
```
Centered Feezy on coin pile biting coin. Full frame purple nebula. No text overlays.
```
