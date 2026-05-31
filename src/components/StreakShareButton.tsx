"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { categoryMeta } from "@/lib/categories";

type Props = {
  habitName: string;
  category: string;
  streak: number;
  best: number;
  rate30: number;
  rate90: number;
};

/** Render a 1200x630 streak card to a hidden canvas, then export PNG. */
function drawCard(canvas: HTMLCanvasElement, p: Props) {
  const W = 1200;
  const H = 630;
  canvas.width = W;
  canvas.height = H;
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) return;
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  const cat = categoryMeta(p.category);

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#020617");
  bg.addColorStop(1, "#1e293b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative blurred blob in accent color
  const blob = ctx.createRadialGradient(W - 200, 120, 0, W - 200, 120, 380);
  blob.addColorStop(0, cat.hex + "55");
  blob.addColorStop(1, cat.hex + "00");
  ctx.fillStyle = blob;
  ctx.fillRect(0, 0, W, H);

  // Small monogram + brand
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "700 22px -apple-system, system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("habit-tracker", 64, 60);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "700 13px -apple-system, system-ui, sans-serif";
  ctx.fillText("BUILDING A STREAK", 64, 90);

  // Category chip
  ctx.fillStyle = cat.hex;
  const chipText = p.category.toUpperCase();
  ctx.font = "800 18px -apple-system, system-ui, sans-serif";
  const chipW = ctx.measureText(chipText).width + 32;
  ctx.beginPath();
  // rounded chip
  const cy = 200, cx = 64, ch = 36, cr = 18;
  ctx.fillStyle = cat.hex + "33";
  ctx.beginPath();
  ctx.moveTo(cx + cr, cy);
  ctx.lineTo(cx + chipW - cr, cy);
  ctx.quadraticCurveTo(cx + chipW, cy, cx + chipW, cy + cr);
  ctx.lineTo(cx + chipW, cy + ch - cr);
  ctx.quadraticCurveTo(cx + chipW, cy + ch, cx + chipW - cr, cy + ch);
  ctx.lineTo(cx + cr, cy + ch);
  ctx.quadraticCurveTo(cx, cy + ch, cx, cy + ch - cr);
  ctx.lineTo(cx, cy + cr);
  ctx.quadraticCurveTo(cx, cy, cx + cr, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = cat.hex;
  ctx.font = "800 18px -apple-system, system-ui, sans-serif";
  ctx.fillText(chipText, cx + 16, cy + 8);

  // Habit name (auto-shrinking)
  ctx.fillStyle = "#f8fafc";
  const maxNameWidth = W - 128;
  let fontSize = 84;
  ctx.font = `800 ${fontSize}px -apple-system, system-ui, sans-serif`;
  while (ctx.measureText(p.habitName).width > maxNameWidth && fontSize > 48) {
    fontSize -= 4;
    ctx.font = `800 ${fontSize}px -apple-system, system-ui, sans-serif`;
  }
  ctx.fillText(p.habitName, 64, 260);

  // Big streak number with fire
  ctx.fillStyle = "#fbbf24";
  ctx.font = "700 120px -apple-system, system-ui, sans-serif";
  ctx.fillText("🔥", 64, 360);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 220px -apple-system, system-ui, sans-serif";
  ctx.fillText(String(p.streak), 220, 340);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "700 38px -apple-system, system-ui, sans-serif";
  ctx.fillText(`day${p.streak === 1 ? "" : "s"}`, 220 + ctx.measureText(String(p.streak)).width + 24, 460);

  // Stat row
  function statBlock(x: number, label: string, value: string) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "700 12px -apple-system, system-ui, sans-serif";
    ctx.fillText(label.toUpperCase(), x, H - 100);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 36px -apple-system, system-ui, sans-serif";
    ctx.fillText(value, x, H - 80);
  }
  statBlock(64, "Best streak", `${p.best}d`);
  statBlock(320, "30-day rate", `${p.rate30}%`);
  statBlock(576, "90-day rate", `${p.rate90}%`);

  // Footer URL
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "700 18px -apple-system, system-ui, sans-serif";
  const url = "habit-tracker";
  const urlW = ctx.measureText(url).width;
  ctx.fillText(url, W - 64 - urlW, H - 50);

  // Logo mark (checkmark in progress ring) in corner — matches the PWA icon
  const mr = 12, mx = W - 64 - 56, my = H - 76, ms = 48;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.roundRect(mx, my, ms, ms, mr);
  ctx.fill();
  // Progress ring (78% arc, starting at top)
  const lcx = mx + ms / 2, lcy = my + ms / 2, r = ms * 0.32;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(lcx, lcy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(lcx, lcy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.78);
  ctx.stroke();
  // Checkmark
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(lcx - 8, lcy + 1);
  ctx.lineTo(lcx - 2, lcy + 7);
  ctx.lineTo(lcx + 9, lcy - 5);
  ctx.stroke();
}

export function StreakShareButton(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  function generate() {
    if (!canvasRef.current) return;
    drawCard(canvasRef.current, props);
    setDataUrl(canvasRef.current.toDataURL("image/png"));
    setOpen(true);
  }

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${props.habitName.replace(/\s+/g, "-").toLowerCase()}-streak.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Saved to downloads");
  }

  async function shareNative() {
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "streak.png", { type: "image/png" });
      type ShareWithFiles = Navigator & { canShare?: (data: ShareData & { files?: File[] }) => boolean };
      const nav = navigator as ShareWithFiles;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My habit streak",
          text: `${props.streak}-day ${props.habitName} streak 🔥`,
        });
      } else {
        download();
      }
    } catch {
      // user cancelled or share failed; fall back to download
    }
  }

  return (
    <>
      <button
        onClick={generate}
        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-900 rounded-lg font-semibold text-sm shadow-sm ring-1 ring-slate-200 hover:ring-slate-300 transition"
        title="Generate a sharable image of this streak"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share streak
      </button>

      <canvas ref={canvasRef} className="hidden" />

      {open && dataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Share your streak</h3>
                <p className="text-xs text-slate-500 mt-0.5">1200 × 630 — perfect for social</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition"
                aria-label="close"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="Streak card" className="w-full rounded-lg shadow-md" />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={download}
                className="px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Download PNG
              </button>
              <button
                onClick={shareNative}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
              >
                Share…
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
