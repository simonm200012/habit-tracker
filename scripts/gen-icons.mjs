// Run from project root: `node scripts/gen-icons.mjs`
// Requires the dev-only "canvas" package. Outputs public/icon-192.png and public/icon-512.png
import { createCanvas } from "canvas";
import fs from "fs";

function makeIcon(size, file) {
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(1, "#334155");
  ctx.fillStyle = grad;
  const r = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${size * 0.42}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ht", size / 2, size / 2 + size * 0.02);
  fs.writeFileSync(file, c.toBuffer("image/png"));
  console.log("wrote", file);
}

makeIcon(192, "public/icon-192.png");
makeIcon(512, "public/icon-512.png");
