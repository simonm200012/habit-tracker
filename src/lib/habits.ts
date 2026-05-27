import type { Habit, HabitLog } from "./types";

/** Format Date as YYYY-MM-DD (local-date safe). */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** All ISO dates in [start, end], inclusive. */
export function dateRange(start: Date, end: Date): string[] {
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    out.push(isoDate(d));
  }
  return out;
}

/** Is the given habit scheduled for date d (based on frequency). */
export function isScheduled(habit: Pick<Habit, "frequency">, d: Date): boolean {
  if (habit.frequency === "daily") return true;
  const dow = d.getDay(); // 0=sun
  if (habit.frequency === "weekdays") return dow >= 1 && dow <= 5;
  if (habit.frequency === "weekly") return dow === 1; // monday default
  return true;
}

/** Compute current streak ending today (consecutive scheduled days completed). */
export function currentStreak(
  habit: Pick<Habit, "frequency">,
  logs: Set<string>,
  today = new Date(),
): number {
  let streak = 0;
  let d = new Date(today);
  while (true) {
    if (!isScheduled(habit, d)) {
      d = addDays(d, -1);
      continue;
    }
    if (logs.has(isoDate(d))) {
      streak += 1;
      d = addDays(d, -1);
    } else {
      // Allow today to be incomplete without breaking the streak yet.
      if (isoDate(d) === isoDate(today)) {
        d = addDays(d, -1);
        continue;
      }
      break;
    }
    // Sanity guard
    if (streak > 1000) break;
  }
  return streak;
}

/** Longest streak ever for a habit. */
export function bestStreak(
  habit: Pick<Habit, "frequency">,
  logs: Set<string>,
  windowDays = 365,
): number {
  const today = new Date();
  const start = addDays(today, -windowDays);
  let best = 0;
  let cur = 0;
  for (const iso of dateRange(start, today)) {
    const d = new Date(iso);
    if (!isScheduled(habit, d)) continue;
    if (logs.has(iso)) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

/** Completion rate over last N days for a single habit. */
export function completionRate(
  habit: Pick<Habit, "frequency">,
  logs: Set<string>,
  days = 30,
): number {
  const today = new Date();
  const start = addDays(today, -(days - 1));
  let scheduled = 0;
  let done = 0;
  for (const iso of dateRange(start, today)) {
    const d = new Date(iso);
    if (!isScheduled(habit, d)) continue;
    scheduled += 1;
    if (logs.has(iso)) done += 1;
  }
  return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
}

/** Group logs by habit_id into Sets of ISO dates. */
export function groupLogs(
  rows: Pick<HabitLog, "habit_id" | "logged_on">[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!map.has(r.habit_id)) map.set(r.habit_id, new Set());
    map.get(r.habit_id)!.add(r.logged_on);
  }
  return map;
}
