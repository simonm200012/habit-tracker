/**
 * XP + level system computed from existing logs (no extra writes).
 *
 * Award rules (kept simple and predictable):
 *   • 10 XP per habit check-off
 *   • +2 bonus XP per current-streak day (encourages momentum)
 *   • Milestone bonuses at 7 / 30 / 100 / 365 day streaks (50 / 250 / 1000 / 5000)
 *   • +5 XP per perfect day (all scheduled habits done)
 *
 * Levels use a square-root curve so early levels feel quick, later levels
 * require real consistency:
 *   level(xp) = floor( sqrt(xp / 50) ) + 1
 *
 *   L1 = 0 XP
 *   L2 = 50
 *   L3 = 200
 *   L5 = 800
 *   L10 = 4050
 *   L20 = 18050
 *
 * The total XP needed to reach level N is 50 * (N-1)^2.
 */
import { Habit } from "@/lib/types";
import { currentStreak, dateRange, groupLogs, isScheduled, isoDate } from "@/lib/habits";

export type LevelSnapshot = {
  xp: number;
  level: number;
  xpThisLevel: number;
  xpForNextLevel: number;
  progress: number; // 0..1
  perks: string[];
  streakBonusToday: number;
  perfectDays: number;
  totalCheckoffs: number;
};

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * (level - 1);
}

export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

const MILESTONE_BONUS: Record<number, number> = {
  7: 50,
  30: 250,
  100: 1000,
  365: 5000,
};

export function computeLevel(
  habits: Habit[],
  rawLogs: Array<{ habit_id: string; logged_on: string }>,
  vacationDays: Set<string>,
  nowUtc: Date = new Date(),
): LevelSnapshot {
  const logsByHabit = groupLogs(rawLogs);

  let xp = 0;
  let streakBonusToday = 0;
  let perfectDays = 0;
  let totalCheckoffs = 0;

  // Total check-offs across all time
  totalCheckoffs = rawLogs.length;
  xp += totalCheckoffs * 10;

  // Streak-based momentum (per active habit)
  for (const h of habits) {
    if (h.status !== "active") continue;
    const streak = currentStreak(h, logsByHabit.get(h.id) ?? new Set(), nowUtc, vacationDays);
    if (streak > 0) {
      const bonus = streak * 2;
      streakBonusToday += bonus;
      xp += bonus;
      // Milestone bonuses (paid out when you cross them, but here we award
      // every time you're at-or-above — keeps it simple, since these are
      // computed on each render and a check-off only goes up).
      for (const m of Object.keys(MILESTONE_BONUS).map(Number).sort((a, b) => a - b)) {
        if (streak >= m) xp += MILESTONE_BONUS[m];
      }
    }
  }

  // Perfect days bonus — iterate distinct log days
  const logDays = new Set(rawLogs.map((r) => r.logged_on));
  for (const iso of logDays) {
    if (vacationDays.has(iso)) continue;
    const d = new Date(iso);
    const todays = habits.filter((h) => h.status === "active" && isScheduled(h, d));
    if (todays.length === 0) continue;
    const allDone = todays.every((h) => logsByHabit.get(h.id)?.has(iso));
    if (allDone) {
      perfectDays += 1;
      xp += 5;
    }
  }

  const level = levelForXp(xp);
  const xpAtLevel = xpForLevel(level);
  const xpAtNext = xpForLevel(level + 1);
  const xpThisLevel = xp - xpAtLevel;
  const xpForNextLevel = xpAtNext - xpAtLevel;
  const progress = xpForNextLevel === 0 ? 1 : xpThisLevel / xpForNextLevel;

  return {
    xp,
    level,
    xpThisLevel,
    xpForNextLevel,
    progress,
    perks: perksForLevel(level),
    streakBonusToday,
    perfectDays,
    totalCheckoffs,
  };
}

/** What unlocks at each level. Cosmetics + small features. */
export function perksForLevel(level: number): string[] {
  const all: Array<[number, string]> = [
    [1, "Default theme"],
    [2, "Daily quests"],
    [3, "Emerald theme"],
    [5, "Sky theme"],
    [7, "Violet theme"],
    [10, "Rose theme"],
    [12, "Streak insurance: +1 skip credit"],
    [15, "Amber theme"],
    [20, "Dark navy theme"],
    [25, "Year-in-review unlocked"],
    [50, "Master grandmaster crown"],
  ];
  return all.filter(([l]) => l <= level).map(([, p]) => p);
}

export const ALL_THEMES = [
  { id: "slate", name: "Slate", level: 1, accent: "#0f172a" },
  { id: "emerald", name: "Emerald", level: 3, accent: "#047857" },
  { id: "sky", name: "Sky", level: 5, accent: "#0369a1" },
  { id: "violet", name: "Violet", level: 7, accent: "#6d28d9" },
  { id: "rose", name: "Rose", level: 10, accent: "#be123c" },
  { id: "amber", name: "Amber", level: 15, accent: "#b45309" },
  { id: "navy", name: "Navy", level: 20, accent: "#1e3a8a" },
] as const;

export type Theme = (typeof ALL_THEMES)[number];

export function unlockedThemes(level: number) {
  return ALL_THEMES.filter((t) => t.level <= level);
}

/* ============================================================
 * Daily quests — deterministic per day, hand-curated rotation
 * ============================================================ */

const QUESTS = [
  { id: "perfect-day", label: "Complete all scheduled habits today", xp: 50 },
  { id: "two-categories", label: "Check off habits from 2 different categories", xp: 30 },
  { id: "three-categories", label: "Check off habits from 3 different categories", xp: 60 },
  { id: "morning-bird", label: "Check off at least one habit before noon", xp: 20 },
  { id: "evening-finish", label: "Check off at least one habit after 6pm", xp: 20 },
  { id: "extend-streak", label: "Extend any streak that's already 5+ days", xp: 40 },
  { id: "log-journal", label: "Write a journal entry for today", xp: 25 },
  { id: "no-skip", label: "Complete 80% of today's habits", xp: 35 },
] as const;

export type Quest = (typeof QUESTS)[number] & { done: boolean };

export function questsForDay(
  isoDay: string,
  level: number,
  doneIds: Set<string>,
  habits: Habit[],
  todaysLogIds: Set<string>,
  categoriesTouched: number,
  journalDone: boolean,
  hasMorningCheck: boolean,
  hasEveningCheck: boolean,
  longStreakExtended: boolean,
): Quest[] {
  if (level < 2) return [];
  // Deterministic seed from date string to pick 3 quests per day
  const seed = hashString(isoDay);
  const ordered = pickN([...QUESTS], 3, seed);
  return ordered.map((q) => {
    let done = doneIds.has(q.id);
    if (!done) {
      // Auto-detect quest completion
      switch (q.id) {
        case "perfect-day": {
          const todays = habits.filter((h) => h.status === "active" && isScheduled(h, new Date(isoDay)));
          done = todays.length > 0 && todays.every((h) => todaysLogIds.has(h.id));
          break;
        }
        case "two-categories":
          done = categoriesTouched >= 2;
          break;
        case "three-categories":
          done = categoriesTouched >= 3;
          break;
        case "morning-bird":
          done = hasMorningCheck;
          break;
        case "evening-finish":
          done = hasEveningCheck;
          break;
        case "extend-streak":
          done = longStreakExtended;
          break;
        case "log-journal":
          done = journalDone;
          break;
        case "no-skip": {
          const todays = habits.filter((h) => h.status === "active" && isScheduled(h, new Date(isoDay)));
          done = todays.length > 0 && (todays.filter((h) => todaysLogIds.has(h.id)).length / todays.length) >= 0.8;
          break;
        }
      }
    }
    return { ...q, done };
  });
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  let s = seed;
  while (out.length < n && used.size < arr.length) {
    s = (s * 9301 + 49297) % 233280;
    const idx = s % arr.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
  }
  return out;
}

/* Used to compute "extend-streak" quest: pre-checked streak ≥5 yesterday */
export function longStreakExtendedToday(
  habits: Habit[],
  rawLogs: Array<{ habit_id: string; logged_on: string }>,
  vacationDays: Set<string>,
  nowUtc: Date,
): boolean {
  const todayIso = isoDate(nowUtc);
  const logsByHabit = groupLogs(rawLogs);
  for (const h of habits) {
    if (h.status !== "active") continue;
    if (!logsByHabit.get(h.id)?.has(todayIso)) continue;
    const streak = currentStreak(h, logsByHabit.get(h.id) ?? new Set(), nowUtc, vacationDays);
    // If they checked off today AND streak >=6 (which means yesterday's streak was 5+), credit
    if (streak >= 6) return true;
  }
  return false;
}

export function unusedDateRange(from: Date, to: Date): string[] {
  return dateRange(from, to);
}
