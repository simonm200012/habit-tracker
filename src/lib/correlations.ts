/**
 * Pairwise habit correlation: among days both habits were scheduled, do they
 * tend to be done together? Uses Pearson's φ (phi) coefficient for binary
 * outcomes, then surfaces the top positive and negative associations.
 */
import type { Habit } from "@/lib/types";
import { dateRange, groupLogs, isScheduled } from "@/lib/habits";

export type Correlation = {
  habitA: Habit;
  habitB: Habit;
  phi: number; // -1..1
  jointDone: number;
  daysOverlap: number;
};

export function pairwiseCorrelations(
  habits: Habit[],
  rawLogs: Array<{ habit_id: string; logged_on: string }>,
  rangeFrom: Date,
  rangeTo: Date,
): Correlation[] {
  const active = habits.filter((h) => h.status === "active");
  if (active.length < 2) return [];

  const logsByHabit = groupLogs(rawLogs);
  const days = dateRange(rangeFrom, rangeTo);

  const out: Correlation[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const aLogs = logsByHabit.get(a.id) ?? new Set();
      const bLogs = logsByHabit.get(b.id) ?? new Set();

      // 2x2 contingency table: both done / a only / b only / neither
      let n00 = 0;
      let n01 = 0;
      let n10 = 0;
      let n11 = 0;

      for (const iso of days) {
        const d = new Date(iso);
        const aSched = isScheduled(a, d);
        const bSched = isScheduled(b, d);
        if (!aSched || !bSched) continue;
        const aDone = aLogs.has(iso);
        const bDone = bLogs.has(iso);
        if (aDone && bDone) n11++;
        else if (aDone && !bDone) n10++;
        else if (!aDone && bDone) n01++;
        else n00++;
      }

      const total = n00 + n01 + n10 + n11;
      if (total < 7) continue; // need at least a week of overlap

      const r1 = n11 + n10;
      const r0 = n01 + n00;
      const c1 = n11 + n01;
      const c0 = n10 + n00;

      const denom = Math.sqrt(r1 * r0 * c1 * c0);
      if (denom === 0) continue;
      const phi = (n11 * n00 - n10 * n01) / denom;

      out.push({ habitA: a, habitB: b, phi, jointDone: n11, daysOverlap: total });
    }
  }

  return out.sort((a, b) => Math.abs(b.phi) - Math.abs(a.phi));
}

export function describeCorrelation(c: Correlation): string {
  const pct = Math.round(Math.abs(c.phi) * 100);
  if (c.phi > 0.3)
    return `On days you do ${c.habitA.name}, you're more likely to also do ${c.habitB.name}. (${pct}% correlation)`;
  if (c.phi < -0.3)
    return `${c.habitA.name} and ${c.habitB.name} tend to crowd each other out. (${pct}% inverse)`;
  if (c.phi > 0)
    return `Mild positive link between ${c.habitA.name} and ${c.habitB.name}.`;
  return `Mild inverse link between ${c.habitA.name} and ${c.habitB.name}.`;
}
