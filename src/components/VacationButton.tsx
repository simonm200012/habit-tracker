"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleVacationDay } from "@/app/actions";

export function VacationButton({
  isoDay,
  initiallyOn,
}: {
  isoDay: string;
  initiallyOn: boolean;
}) {
  const [on, setOn] = useState(initiallyOn);
  const [, startTransition] = useTransition();

  function handle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await toggleVacationDay(isoDay);
        if (next) toast("Today marked as a skip day — streaks paused.");
        else toast("Skip day removed.");
      } catch {
        setOn(!next);
        toast.error("Couldn't update");
      }
    });
  }

  return (
    <button
      onClick={handle}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg ring-1 transition flex items-center gap-1.5 ${
        on
          ? "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
      }`}
      title="Skip days don't break streaks"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
      {on ? "Skip day on" : "Skip today"}
    </button>
  );
}
