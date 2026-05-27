"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { toast } from "sonner";
import { saveDailyNote } from "@/app/actions";

export function DailyJournal({
  isoDay,
  initial,
}: {
  isoDay: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<NodeJS.Timeout | null>(null);
  const lastSaved = useRef(initial);

  useEffect(() => {
    if (value === lastSaved.current) {
      setSaved("idle");
      return;
    }
    setSaved("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        try {
          await saveDailyNote(isoDay, value);
          lastSaved.current = value;
          setSaved("saved");
          if (value.length > 0) toast.success("Journal saved");
          setTimeout(() => setSaved("idle"), 1800);
        } catch {
          toast.error("Couldn't save journal");
          setSaved("idle");
        }
      });
    }, 900);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, isoDay]);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Journal</h2>
          <p className="text-xs text-slate-500 mt-0.5">A short reflection for today.</p>
        </div>
        <span className="text-xs font-semibold tabular-nums text-slate-500">
          {saved === "saving" && <span className="text-amber-600">Saving…</span>}
          {saved === "saved" && <span className="text-emerald-600">Saved ✓</span>}
          {saved === "idle" && (wordCount > 0 ? `${wordCount} words` : "")}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What went well? What's one thing to improve tomorrow?"
        rows={6}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition resize-none leading-relaxed"
      />
    </div>
  );
}
