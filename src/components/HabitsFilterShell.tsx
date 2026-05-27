"use client";

import { useMemo, useState } from "react";
import { SortableHabitsTable } from "./SortableHabitsTable";
import { CATEGORIES } from "@/lib/categories";
import type { Habit } from "@/lib/types";

type Row = {
  habit: Habit;
  streak: number;
  best: number;
  rate30: number;
};

const DIFFS = ["easy", "medium", "hard"] as const;
const FREQS = ["daily", "weekdays", "weekly"] as const;

export function HabitsFilterShell({ rows: initialRows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [frequency, setFrequency] = useState<string>("all");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initialRows.filter(({ habit: h }) => {
      if (needle && !h.name.toLowerCase().includes(needle)) return false;
      if (category !== "all" && h.category !== category) return false;
      if (difficulty !== "all" && h.difficulty !== difficulty) return false;
      if (frequency !== "all" && h.frequency !== frequency) return false;
      return true;
    });
  }, [initialRows, q, category, difficulty, frequency]);

  const activeFilter = category !== "all" || difficulty !== "all" || frequency !== "all" || q.length > 0;

  return (
    <div>
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          >
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search habits…"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
        >
          <option value="all">All difficulty</option>
          {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
        >
          <option value="all">All schedule</option>
          {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        {activeFilter && (
          <button
            onClick={() => { setQ(""); setCategory("all"); setDifficulty("all"); setFrequency("all"); }}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500 font-semibold tabular-nums">
          {rows.length} of {initialRows.length}
        </span>
      </div>
      <SortableHabitsTable rows={rows} reorderable={!activeFilter} />
    </div>
  );
}
