"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

export function InviteCodeCard({
  code,
  label = "Share this code",
  description,
  shareUrl,
  onGenerate,
  generateLabel = "Generate code",
}: {
  code?: string | null;
  label?: string;
  description?: string;
  shareUrl?: string;
  onGenerate?: () => Promise<string | void>;
  generateLabel?: string;
}) {
  const [current, setCurrent] = useState(code ?? null);
  const [pending, startTransition] = useTransition();

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed"),
    );
  }

  if (!current) {
    return (
      <button
        onClick={() => {
          if (!onGenerate) return;
          startTransition(async () => {
            try {
              const c = await onGenerate();
              if (typeof c === "string") setCurrent(c);
              toast.success("Code generated");
            } catch {
              toast.error("Could not generate code");
            }
          });
        }}
        disabled={pending}
        className="w-full p-4 rounded-xl bg-slate-50 hover:bg-slate-100 ring-1 ring-dashed ring-slate-300 text-sm font-semibold text-slate-700 transition disabled:opacity-60"
      >
        {pending ? "Generating…" : generateLabel}
      </button>
    );
  }

  const fullShare = shareUrl ? `${shareUrl}${current}` : current;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="flex items-center gap-2 mt-2">
        <code className="text-2xl font-black font-mono tracking-widest flex-1 select-all">
          {current}
        </code>
        <button
          onClick={() => copy(current)}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition"
          title="Copy code"
        >
          Copy
        </button>
        {shareUrl && (
          <button
            onClick={() => copy(fullShare)}
            className="px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-bold transition"
            title="Copy share link"
          >
            Copy link
          </button>
        )}
      </div>
      {description && <p className="text-xs text-slate-300 mt-3 leading-snug">{description}</p>}
    </div>
  );
}
