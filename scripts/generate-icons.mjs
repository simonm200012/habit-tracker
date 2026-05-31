// Generates icon-192.png and icon-512.png from an SVG source.
// Run with:  node scripts/generate-icons.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;

// Design:
//  - Rounded-square tile with a subtle indigo-to-slate gradient
//  - Bold progress ring (270°) in emerald, conveying "in progress"
//  - Centered checkmark in white, conveying "habit done"
//  - Soft inner glow for depth
//
// Decisions:
//  - 1024px source → scaled by sharp to 192 / 512 (anti-aliased)
//  - Stroke-linecap round → reads clean at favicon sizes
//  - 22% corner radius matches Apple's contemporary app-icon mask

const SIZE = 1024;
const RADIUS = SIZE * 0.22; // ~225
const RING_STROKE = SIZE * 0.072; // ~74
const RING_R = SIZE * 0.36; // ~369
const CHECK_STROKE = SIZE * 0.085; // ~87

// Progress arc: 78% complete → ends at +280° from top (-90°)
const startAngle = -90; // top
const endAngle = startAngle + 360 * 0.78;
const ringCx = SIZE / 2;
const ringCy = SIZE / 2;
const polarX = (a) => ringCx + RING_R * Math.cos((a * Math.PI) / 180);
const polarY = (a) => ringCy + RING_R * Math.sin((a * Math.PI) / 180);
const largeArc = endAngle - startAngle > 180 ? 1 : 0;
const arcPath = `M ${polarX(startAngle)} ${polarY(startAngle)} A ${RING_R} ${RING_R} 0 ${largeArc} 1 ${polarX(endAngle)} ${polarY(endAngle)}`;

const svg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="55%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="55%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="ringShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="14"/>
      <feOffset dx="0" dy="10" result="off"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background tile -->
  <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="url(#tile)"/>
  <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="url(#glow)"/>

  <!-- Track ring (faint) -->
  <circle cx="${ringCx}" cy="${ringCy}" r="${RING_R}"
          fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="${RING_STROKE}"/>

  <!-- Progress ring -->
  <path d="${arcPath}"
        fill="none" stroke="url(#ring)" stroke-width="${RING_STROKE}"
        stroke-linecap="round" filter="url(#ringShadow)"/>

  <!-- Endpoint dot for polish -->
  <circle cx="${polarX(endAngle)}" cy="${polarY(endAngle)}" r="${RING_STROKE * 0.5}" fill="#34d399"/>

  <!-- Checkmark -->
  <path d="M ${SIZE * 0.34} ${SIZE * 0.51}
           L ${SIZE * 0.46} ${SIZE * 0.62}
           L ${SIZE * 0.68} ${SIZE * 0.40}"
        fill="none" stroke="#ffffff" stroke-width="${CHECK_STROKE}"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

async function generate(size, filename) {
  const out = await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(ROOT, "public", filename), out);
  console.log(`✓ ${filename}  (${out.length.toLocaleString()} bytes)`);
}

await generate(512, "icon-512.png");
await generate(192, "icon-192.png");
await generate(180, "apple-touch-icon.png");
await generate(32, "favicon-32.png");

// Also write the SVG source so we can tweak design later.
writeFileSync(join(ROOT, "public", "icon.svg"), svg.trim());
console.log("✓ icon.svg (source)");
