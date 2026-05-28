/**
 * Streak predictions: given a habit's current streak and recent completion
 * rate, estimate which milestones are reachable and when.
 *
 * The model is intentionally simple — projecting current streak forward
 * assuming the user maintains it. We surface "if you keep going" not
 * "you definitely will."
 */
import type { Habit } from "@/lib/types";
import { addDays, isScheduled } from "@/lib/habits";

export type Prediction = {
  milestone: number;
  daysAway: number;
  date: Date;
  isWithinRange: boolean;
};

const MILESTONES = [7, 14, 30, 50, 100, 200, 365, 500, 1000];

export function predictMilestones(
  habit: Habit,
  currentStreakDays: number,
  nowUtc: Date = new Date(),
): Prediction[] {
  if (currentStreakDays === 0) return [];

  // For weekly habits, the streak is counted in scheduled occurrences not days.
  // To simplify the prediction date, we walk forward from today and count
  // scheduled days until we'd hit each milestone.
  return MILESTONES.filter((m) => m > currentStreakDays)
    .slice(0, 4)
    .map((m) => {
      const occurrencesNeeded = m - currentStreakDays;
      let day = 0;
      let occurrences = 0;
      // Walk forward up to 4 years to find the date
      while (occurrences < occurrencesNeeded && day < 365 * 4) {
        day += 1;
        const future = addDays(nowUtc, day);
        if (isScheduled(habit, future)) occurrences += 1;
      }
      const date = addDays(nowUtc, day);
      return {
        milestone: m,
        daysAway: day,
        date,
        isWithinRange: day < 365 * 4,
      };
    });
}

/** Friendly natural-language summary of the next milestone. */
export function summarizeNextMilestone(p: Prediction | undefined): string {
  if (!p || !p.isWithinRange) return "";
  if (p.daysAway === 1) return `🎯 ${p.milestone}-day streak tomorrow if you check off.`;
  if (p.daysAway <= 7)
    return `🎯 ${p.milestone}-day streak in ${p.daysAway} days (${p.date.toLocaleDateString("en", { weekday: "short" })}).`;
  if (p.daysAway <= 30)
    return `🎯 ${p.milestone}-day streak on ${p.date.toLocaleDateString("en", { month: "short", day: "numeric" })}.`;
  return `🎯 ${p.milestone}-day streak on ${p.date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}.`;
}
