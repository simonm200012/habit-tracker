"use server";

import { createClient } from "@/lib/supabase/server";
import { addDays, isoDate } from "@/lib/habits";

const STARTER_HABITS = [
  { name: "Morning workout",    category: "Fitness",     frequency: "daily",    difficulty: "hard",   target_per_week: 6, goal_target: 45, goal_unit: "min",   color: "#ea580c" },
  { name: "Read 20 pages",      category: "Learning",    frequency: "daily",    difficulty: "easy",   target_per_week: 7, goal_target: 20, goal_unit: "pages", color: "#0284c7" },
  { name: "Meditate",           category: "Mindfulness", frequency: "daily",    difficulty: "medium", target_per_week: 7, goal_target: 10, goal_unit: "min",   color: "#e11d48" },
  { name: "Deep work block",    category: "Focus",       frequency: "weekdays", difficulty: "hard",   target_per_week: 5, goal_target: 90, goal_unit: "min",   color: "#7c3aed" },
  { name: "Track expenses",     category: "Finance",     frequency: "daily",    difficulty: "easy",   target_per_week: 7, goal_target: 1,  goal_unit: "",      color: "#d97706" },
  { name: "8 hrs sleep",        category: "Health",      frequency: "daily",    difficulty: "medium", target_per_week: 7, goal_target: 8,  goal_unit: "hrs",   color: "#059669" },
];

/**
 * Seed a new user with starter habits and ~60 days of realistic completion history.
 * No-op if the user already has habits.
 */
export async function maybeSeedSampleData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Skip if already seeded
  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  // Insert habits
  const rows = STARTER_HABITS.map((h) => ({
    user_id: user.id,
    name: h.name,
    color: h.color,
    target_per_week: h.target_per_week,
    category: h.category,
    frequency: h.frequency,
    difficulty: h.difficulty,
    goal_target: h.goal_target,
    goal_unit: h.goal_unit,
    status: "active",
    active: true,
  }));
  const { data: inserted, error } = await supabase
    .from("habits")
    .insert(rows)
    .select("id, name, frequency");
  if (error || !inserted) return;

  // Generate logs — each habit has a realistic, distinct completion pattern
  const today = new Date();
  const logs: { user_id: string; habit_id: string; logged_on: string }[] = [];

  // Per-habit completion probabilities (last 60 days)
  // Decaying near today to leave some "today incomplete" so check-off feels real.
  const profiles: Record<string, { base: number; recent: number }> = {
    "Morning workout":  { base: 0.78, recent: 0.65 },
    "Read 20 pages":    { base: 0.90, recent: 0.85 },
    "Meditate":         { base: 0.70, recent: 0.55 },
    "Deep work block":  { base: 0.82, recent: 0.70 },
    "Track expenses":   { base: 0.95, recent: 0.90 },
    "8 hrs sleep":      { base: 0.65, recent: 0.60 },
  };

  for (const h of inserted) {
    const p = profiles[h.name] ?? { base: 0.8, recent: 0.7 };
    for (let i = 60; i >= 0; i--) {
      const d = addDays(today, -i);
      const dow = d.getDay();
      if (h.frequency === "weekdays" && (dow === 0 || dow === 6)) continue;

      // Probability eases from base → recent as we approach today.
      const t = (60 - i) / 60; // 0..1
      const prob = p.base * (1 - t) + p.recent * t;

      // Skip "today" sometimes so it feels incomplete and user has stuff to do.
      if (i === 0 && Math.random() < 0.55) continue;

      if (Math.random() < prob) {
        logs.push({
          user_id: user.id,
          habit_id: h.id,
          logged_on: isoDate(d),
        });
      }
    }
  }

  if (logs.length > 0) {
    // Batch insert — Postgres handles a few hundred rows easily.
    await supabase.from("habit_logs").insert(logs);
  }
}
