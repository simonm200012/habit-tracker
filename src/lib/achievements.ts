import {
  addDays,
  bestStreak,
  completionRate,
  currentStreak,
  dateRange,
  isoDate,
  isScheduled,
} from "./habits";
import type { Habit } from "./types";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  icon: string; // emoji
  /** 0–100 progress toward unlock. */
  progress: number;
  unlocked: boolean;
  unlockedOn?: string;
  /** Tagline shown on the locked card (next milestone). */
  hint?: string;
};

type Ctx = {
  habits: Habit[];
  logsByHabit: Map<string, Set<string>>;
  vacationDays: Set<string>;
  today: Date;
};

const TIER_RANK: Record<AchievementTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
};

function pct(value: number, target: number): number {
  if (target <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

/** Total successful check-offs across all habits in the window. */
function totalCheckoffs(ctx: Ctx): number {
  let n = 0;
  for (const set of ctx.logsByHabit.values()) n += set.size;
  return n;
}

/** Highest current streak across habits. */
function maxCurrentStreak(ctx: Ctx): number {
  let best = 0;
  for (const h of ctx.habits) {
    const s = currentStreak(
      h,
      ctx.logsByHabit.get(h.id) ?? new Set(),
      ctx.today,
      ctx.vacationDays,
    );
    if (s > best) best = s;
  }
  return best;
}

/** Highest best-ever streak across habits. */
function maxBestStreak(ctx: Ctx): number {
  let best = 0;
  for (const h of ctx.habits) {
    const s = bestStreak(h, ctx.logsByHabit.get(h.id) ?? new Set());
    if (s > best) best = s;
  }
  return best;
}

/** Days within window where every scheduled habit was completed. */
function perfectDays(ctx: Ctx, windowDays = 90): number {
  let perfect = 0;
  for (const iso of dateRange(addDays(ctx.today, -(windowDays - 1)), ctx.today)) {
    const d = new Date(iso);
    if (ctx.vacationDays.has(iso)) continue;
    let scheduled = 0;
    let done = 0;
    for (const h of ctx.habits) {
      if (!isScheduled(h, d)) continue;
      scheduled += 1;
      if (ctx.logsByHabit.get(h.id)?.has(iso)) done += 1;
    }
    if (scheduled > 0 && done === scheduled) perfect += 1;
  }
  return perfect;
}

/** Distinct categories with ≥ 1 active habit. */
function activeCategoryCount(ctx: Ctx): number {
  const cats = new Set<string>();
  for (const h of ctx.habits) cats.add(h.category);
  return cats.size;
}

/** Highest 30-day completion rate across habits. */
function bestRate30(ctx: Ctx): number {
  let best = 0;
  for (const h of ctx.habits) {
    const r = completionRate(h, ctx.logsByHabit.get(h.id) ?? new Set(), 30);
    if (r > best) best = r;
  }
  return best;
}

const DEFINITIONS: ((ctx: Ctx) => Achievement)[] = [
  // === Streak ladder ===
  (ctx) => {
    const v = maxBestStreak(ctx);
    return {
      id: "streak_3",
      name: "First Sparks",
      description: "Hit a 3-day streak on any habit.",
      tier: "bronze",
      icon: "✨",
      progress: pct(v, 3),
      unlocked: v >= 3,
      hint: v < 3 ? `${v}/3 days` : undefined,
    };
  },
  (ctx) => {
    const v = maxBestStreak(ctx);
    return {
      id: "streak_7",
      name: "Week Warrior",
      description: "Maintain a 7-day streak.",
      tier: "bronze",
      icon: "🔥",
      progress: pct(v, 7),
      unlocked: v >= 7,
      hint: v < 7 ? `${v}/7 days` : undefined,
    };
  },
  (ctx) => {
    const v = maxBestStreak(ctx);
    return {
      id: "streak_14",
      name: "Two Weeks Strong",
      description: "Hold a habit for 14 days straight.",
      tier: "silver",
      icon: "🔥",
      progress: pct(v, 14),
      unlocked: v >= 14,
      hint: v < 14 ? `${v}/14 days` : undefined,
    };
  },
  (ctx) => {
    const v = maxBestStreak(ctx);
    return {
      id: "streak_30",
      name: "Identity Shift",
      description: "30-day streak — habits become identity.",
      tier: "gold",
      icon: "🚀",
      progress: pct(v, 30),
      unlocked: v >= 30,
      hint: v < 30 ? `${v}/30 days` : undefined,
    };
  },
  (ctx) => {
    const v = maxBestStreak(ctx);
    return {
      id: "streak_100",
      name: "Century",
      description: "Reach a 100-day streak.",
      tier: "platinum",
      icon: "💎",
      progress: pct(v, 100),
      unlocked: v >= 100,
      hint: v < 100 ? `${v}/100 days` : undefined,
    };
  },

  // === Consistency / perfect days ===
  (ctx) => {
    const v = perfectDays(ctx, 90);
    return {
      id: "perfect_1",
      name: "Perfect Day",
      description: "Complete every scheduled habit in one day.",
      tier: "bronze",
      icon: "🎯",
      progress: pct(v, 1),
      unlocked: v >= 1,
      hint: v === 0 ? "0 perfect days" : undefined,
    };
  },
  (ctx) => {
    const v = perfectDays(ctx, 90);
    return {
      id: "perfect_7",
      name: "Perfect Week",
      description: "Hit 7 perfect days (within 90 days).",
      tier: "silver",
      icon: "🏆",
      progress: pct(v, 7),
      unlocked: v >= 7,
      hint: v < 7 ? `${v}/7` : undefined,
    };
  },
  (ctx) => {
    const v = perfectDays(ctx, 90);
    return {
      id: "perfect_30",
      name: "Locked In",
      description: "30 perfect days within a 90-day window.",
      tier: "platinum",
      icon: "👑",
      progress: pct(v, 30),
      unlocked: v >= 30,
      hint: v < 30 ? `${v}/30` : undefined,
    };
  },

  // === Volume ===
  (ctx) => {
    const v = totalCheckoffs(ctx);
    return {
      id: "volume_10",
      name: "Getting Started",
      description: "10 total check-offs.",
      tier: "bronze",
      icon: "🌱",
      progress: pct(v, 10),
      unlocked: v >= 10,
      hint: v < 10 ? `${v}/10` : undefined,
    };
  },
  (ctx) => {
    const v = totalCheckoffs(ctx);
    return {
      id: "volume_100",
      name: "Centurion",
      description: "100 total check-offs.",
      tier: "silver",
      icon: "📈",
      progress: pct(v, 100),
      unlocked: v >= 100,
      hint: v < 100 ? `${v}/100` : undefined,
    };
  },
  (ctx) => {
    const v = totalCheckoffs(ctx);
    return {
      id: "volume_500",
      name: "Habit Veteran",
      description: "500 total check-offs.",
      tier: "gold",
      icon: "🏅",
      progress: pct(v, 500),
      unlocked: v >= 500,
      hint: v < 500 ? `${v}/500` : undefined,
    };
  },

  // === Breadth ===
  (ctx) => {
    const v = activeCategoryCount(ctx);
    return {
      id: "cat_3",
      name: "Well-Rounded",
      description: "Active habits across 3 different categories.",
      tier: "bronze",
      icon: "🎭",
      progress: pct(v, 3),
      unlocked: v >= 3,
      hint: v < 3 ? `${v}/3 categories` : undefined,
    };
  },
  (ctx) => {
    const v = activeCategoryCount(ctx);
    return {
      id: "cat_6",
      name: "Triathlete",
      description: "Active habits in all 6 categories.",
      tier: "gold",
      icon: "🧬",
      progress: pct(v, 6),
      unlocked: v >= 6,
      hint: v < 6 ? `${v}/6 categories` : undefined,
    };
  },

  // === Mastery ===
  (ctx) => {
    const v = bestRate30(ctx);
    return {
      id: "rate_80",
      name: "On Pace",
      description: "Hold an 80% 30-day rate on any habit.",
      tier: "silver",
      icon: "📊",
      progress: pct(v, 80),
      unlocked: v >= 80,
      hint: v < 80 ? `${v}% / 80%` : undefined,
    };
  },
  (ctx) => {
    const v = bestRate30(ctx);
    return {
      id: "rate_95",
      name: "Bulletproof",
      description: "Hit 95% 30-day completion on any habit.",
      tier: "platinum",
      icon: "🛡️",
      progress: pct(v, 95),
      unlocked: v >= 95,
      hint: v < 95 ? `${v}% / 95%` : undefined,
    };
  },
];

export function evaluateAchievements(ctx: Ctx): Achievement[] {
  return DEFINITIONS.map((fn) => fn(ctx)).sort((a, b) => {
    // Unlocked first, then by tier desc, then by progress desc
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.tier !== b.tier) return TIER_RANK[b.tier] - TIER_RANK[a.tier];
    return b.progress - a.progress;
  });
}

export const TIER_CLASSES: Record<AchievementTier, { bg: string; ring: string; text: string; label: string }> = {
  bronze:   { bg: "bg-amber-50",   ring: "ring-amber-200",   text: "text-amber-800",   label: "Bronze" },
  silver:   { bg: "bg-slate-100",  ring: "ring-slate-300",   text: "text-slate-700",   label: "Silver" },
  gold:     { bg: "bg-yellow-50",  ring: "ring-yellow-300",  text: "text-yellow-800",  label: "Gold" },
  platinum: { bg: "bg-violet-50",  ring: "ring-violet-300",  text: "text-violet-800",  label: "Platinum" },
};
