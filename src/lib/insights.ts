import {
  addDays,
  completionRate,
  currentStreak,
  dateRange,
  isoDate,
  isScheduled,
} from "./habits";
import type { Habit } from "./types";

export type InsightTone = "positive" | "warning" | "neutral";

export type Insight = {
  id: string;
  tone: InsightTone;
  icon: string;
  title: string;
  body: string;
  /** Optional habit id this insight is anchored to. */
  habitId?: string;
};

type Ctx = {
  habits: Habit[];
  logsByHabit: Map<string, Set<string>>;
  vacationDays: Set<string>;
  today: Date;
};

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dowIndex(d: Date): number {
  return d.getDay();
}

/** Generate the top N insights from the data. */
export function generateInsights(ctx: Ctx, max = 4): Insight[] {
  const out: Insight[] = [];
  const todayIso = isoDate(ctx.today);

  // 1) Streak-at-risk: habit scheduled today, currently has a streak ≥ 3, not yet done today.
  for (const h of ctx.habits) {
    if (!isScheduled(h, ctx.today)) continue;
    const logs = ctx.logsByHabit.get(h.id) ?? new Set<string>();
    if (logs.has(todayIso)) continue;
    const streak = currentStreak(h, logs, ctx.today, ctx.vacationDays);
    if (streak >= 3) {
      out.push({
        id: `risk_${h.id}`,
        tone: "warning",
        icon: "⚠️",
        title: `${h.name}: ${streak}-day streak at risk`,
        body: `Check it off today to keep the streak alive.`,
        habitId: h.id,
      });
    }
  }

  // 2) Day-of-week strength / weakness across all habits (last 60 days)
  const dowAgg = Array.from({ length: 7 }, () => ({ s: 0, c: 0 }));
  for (const iso of dateRange(addDays(ctx.today, -59), ctx.today)) {
    const d = new Date(iso);
    if (ctx.vacationDays.has(iso)) continue;
    const idx = dowIndex(d);
    for (const h of ctx.habits) {
      if (!isScheduled(h, d)) continue;
      dowAgg[idx].s += 1;
      if (ctx.logsByHabit.get(h.id)?.has(iso)) dowAgg[idx].c += 1;
    }
  }
  const rates = dowAgg.map((x) => (x.s === 0 ? null : Math.round((x.c / x.s) * 100)));
  const valid = rates.map((r, i) => ({ r, i })).filter((x): x is { r: number; i: number } => x.r !== null);
  if (valid.length >= 4) {
    const best = valid.reduce((b, x) => (x.r > b.r ? x : b));
    const worst = valid.reduce((w, x) => (x.r < w.r ? x : w));
    if (best.r - worst.r >= 20) {
      out.push({
        id: "dow_best",
        tone: "positive",
        icon: "📈",
        title: `${DOW_NAMES[best.i]}s are your strongest day`,
        body: `You complete ${best.r}% of habits on ${DOW_NAMES[best.i]}s vs ${worst.r}% on ${DOW_NAMES[worst.i]}s.`,
      });
      out.push({
        id: "dow_weak",
        tone: "warning",
        icon: "🎯",
        title: `${DOW_NAMES[worst.i]}s are your weak spot`,
        body: `You miss the most habits on ${DOW_NAMES[worst.i]}s. A small win there compounds.`,
      });
    }
  }

  // 3) Trending up or down (last 14 days vs previous 14 days)
  function rateOver(start: Date, end: Date): { rate: number; sched: number } {
    let s = 0;
    let c = 0;
    for (const iso of dateRange(start, end)) {
      const d = new Date(iso);
      if (ctx.vacationDays.has(iso)) continue;
      for (const h of ctx.habits) {
        if (!isScheduled(h, d)) continue;
        s += 1;
        if (ctx.logsByHabit.get(h.id)?.has(iso)) c += 1;
      }
    }
    return { rate: s === 0 ? 0 : Math.round((c / s) * 100), sched: s };
  }
  const recent = rateOver(addDays(ctx.today, -13), ctx.today);
  const prior = rateOver(addDays(ctx.today, -27), addDays(ctx.today, -14));
  if (recent.sched > 0 && prior.sched > 0) {
    const delta = recent.rate - prior.rate;
    if (delta >= 10) {
      out.push({
        id: "trend_up",
        tone: "positive",
        icon: "🚀",
        title: `Up ${delta}% vs two weeks ago`,
        body: `Last 14d: ${recent.rate}% completion · prior 14d: ${prior.rate}%. Keep the momentum.`,
      });
    } else if (delta <= -10) {
      out.push({
        id: "trend_down",
        tone: "warning",
        icon: "📉",
        title: `Down ${Math.abs(delta)}% vs two weeks ago`,
        body: `Last 14d: ${recent.rate}% · prior 14d: ${prior.rate}%. Time to refocus on basics.`,
      });
    }
  }

  // 4) Best-performing habit
  let bestHabit: { h: Habit; rate: number } | null = null;
  for (const h of ctx.habits) {
    const r = completionRate(h, ctx.logsByHabit.get(h.id) ?? new Set(), 30);
    if (!bestHabit || r > bestHabit.rate) bestHabit = { h, rate: r };
  }
  if (bestHabit && bestHabit.rate >= 80) {
    out.push({
      id: "top_habit",
      tone: "positive",
      icon: "🏆",
      title: `${bestHabit.h.name} is on fire`,
      body: `${bestHabit.rate}% completion over 30 days — your top habit right now.`,
      habitId: bestHabit.h.id,
    });
  }

  // 5) Worst-performing habit (suggestion to refocus or pause)
  let worstHabit: { h: Habit; rate: number } | null = null;
  for (const h of ctx.habits) {
    const r = completionRate(h, ctx.logsByHabit.get(h.id) ?? new Set(), 30);
    if (!worstHabit || r < worstHabit.rate) worstHabit = { h, rate: r };
  }
  if (worstHabit && worstHabit.rate < 40 && ctx.habits.length > 1) {
    out.push({
      id: "low_habit",
      tone: "warning",
      icon: "🪫",
      title: `${worstHabit.h.name} is struggling`,
      body: `Only ${worstHabit.rate}% over 30 days. Consider lowering the bar or pausing.`,
      habitId: worstHabit.h.id,
    });
  }

  // Order: warnings (risks first), then positive, max N
  out.sort((a, b) => {
    const score = (t: InsightTone) => (t === "warning" ? 0 : t === "positive" ? 1 : 2);
    return score(a.tone) - score(b.tone);
  });

  return out.slice(0, max);
}

export const INSIGHT_CLASSES: Record<InsightTone, { bg: string; ring: string; iconBg: string }> = {
  positive: { bg: "bg-emerald-50/60", ring: "ring-emerald-200", iconBg: "bg-emerald-100" },
  warning:  { bg: "bg-amber-50/60",   ring: "ring-amber-200",   iconBg: "bg-amber-100" },
  neutral:  { bg: "bg-slate-50/60",   ring: "ring-slate-200",   iconBg: "bg-slate-100" },
};
