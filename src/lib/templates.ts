import type { HabitCategory, HabitDifficulty, HabitFrequency } from "./types";

export type TemplateHabit = {
  name: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  difficulty: HabitDifficulty;
  target_per_week: number;
  goal_target: number;
  goal_unit: string;
};

export type HabitTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  habits: TemplateHabit[];
};

export const TEMPLATES: HabitTemplate[] = [
  {
    id: "atomic-starter",
    name: "Atomic Habits Starter",
    description: "Small wins that compound. Start absurdly tiny — make it easier than not doing it.",
    emoji: "⚛️",
    habits: [
      { name: "Drink water on wake",     category: "Health",      frequency: "daily", difficulty: "easy", target_per_week: 7, goal_target: 1,  goal_unit: "" },
      { name: "Read 10 pages",            category: "Learning",    frequency: "daily", difficulty: "easy", target_per_week: 7, goal_target: 10, goal_unit: "pages" },
      { name: "Meditate 5 min",           category: "Mindfulness", frequency: "daily", difficulty: "easy", target_per_week: 7, goal_target: 5,  goal_unit: "min" },
      { name: "1 push-up",                category: "Fitness",     frequency: "daily", difficulty: "easy", target_per_week: 7, goal_target: 1,  goal_unit: "reps" },
      { name: "Write 1 journal line",     category: "Mindfulness", frequency: "daily", difficulty: "easy", target_per_week: 7, goal_target: 1,  goal_unit: "" },
    ],
  },
  {
    id: "marathon",
    name: "Marathon Training",
    description: "16-week plan basics. Long runs, recovery, sleep, mobility.",
    emoji: "🏃",
    habits: [
      { name: "Easy run",                  category: "Fitness",  frequency: "weekdays", difficulty: "medium", target_per_week: 4, goal_target: 45, goal_unit: "min" },
      { name: "Long run",                  category: "Fitness",  frequency: "weekly",   difficulty: "hard",   target_per_week: 1, goal_target: 90, goal_unit: "min" },
      { name: "Foam roll + mobility",      category: "Fitness",  frequency: "daily",    difficulty: "easy",   target_per_week: 7, goal_target: 15, goal_unit: "min" },
      { name: "Hydrate (3 L)",             category: "Health",   frequency: "daily",    difficulty: "easy",   target_per_week: 7, goal_target: 3,  goal_unit: "L" },
      { name: "8 h sleep",                 category: "Health",   frequency: "daily",    difficulty: "medium", target_per_week: 7, goal_target: 8,  goal_unit: "hrs" },
    ],
  },
  {
    id: "deep-focus",
    name: "Deep Focus",
    description: "Maker-mode rituals. Protect mornings. Trade reactivity for output.",
    emoji: "🎯",
    habits: [
      { name: "Deep work block",           category: "Focus",       frequency: "weekdays", difficulty: "hard",   target_per_week: 5, goal_target: 90, goal_unit: "min" },
      { name: "No phone before 10am",      category: "Focus",       frequency: "weekdays", difficulty: "hard",   target_per_week: 5, goal_target: 1,  goal_unit: "" },
      { name: "Daily shutdown review",     category: "Focus",       frequency: "weekdays", difficulty: "easy",   target_per_week: 5, goal_target: 10, goal_unit: "min" },
      { name: "Inbox zero by 5pm",         category: "Focus",       frequency: "weekdays", difficulty: "medium", target_per_week: 5, goal_target: 1,  goal_unit: "" },
      { name: "5-min meditation",          category: "Mindfulness", frequency: "daily",    difficulty: "easy",   target_per_week: 7, goal_target: 5,  goal_unit: "min" },
    ],
  },
  {
    id: "mindful-day",
    name: "Mindful Day",
    description: "Calm nervous system, sleep better, regulate stress.",
    emoji: "🧘",
    habits: [
      { name: "Morning meditation",         category: "Mindfulness", frequency: "daily", difficulty: "easy",   target_per_week: 7, goal_target: 10, goal_unit: "min" },
      { name: "Gratitude journal (3 items)", category: "Mindfulness", frequency: "daily", difficulty: "easy",   target_per_week: 7, goal_target: 3,  goal_unit: "items" },
      { name: "No phone 1h before bed",     category: "Health",      frequency: "daily", difficulty: "medium", target_per_week: 7, goal_target: 1,  goal_unit: "" },
      { name: "Mindful breakfast",          category: "Mindfulness", frequency: "daily", difficulty: "easy",   target_per_week: 7, goal_target: 1,  goal_unit: "" },
      { name: "Walk outside",               category: "Health",      frequency: "daily", difficulty: "easy",   target_per_week: 6, goal_target: 20, goal_unit: "min" },
    ],
  },
  {
    id: "financial-discipline",
    name: "Financial Discipline",
    description: "Make money boring. Track, save, review on autopilot.",
    emoji: "💰",
    habits: [
      { name: "Track every expense",         category: "Finance",  frequency: "daily",    difficulty: "easy",   target_per_week: 7, goal_target: 1, goal_unit: "" },
      { name: "Save before spend",           category: "Finance",  frequency: "weekly",   difficulty: "medium", target_per_week: 1, goal_target: 1, goal_unit: "" },
      { name: "Review portfolio",            category: "Finance",  frequency: "weekly",   difficulty: "easy",   target_per_week: 1, goal_target: 1, goal_unit: "" },
      { name: "No impulse purchase",         category: "Finance",  frequency: "daily",    difficulty: "medium", target_per_week: 7, goal_target: 1, goal_unit: "" },
      { name: "Read a finance article",      category: "Learning", frequency: "weekdays", difficulty: "easy",   target_per_week: 3, goal_target: 1, goal_unit: "" },
    ],
  },
  {
    id: "builder-mode",
    name: "Builder Mode",
    description: "Ship something every day. Compound your craft.",
    emoji: "🛠️",
    habits: [
      { name: "Ship something",             category: "Focus",       frequency: "weekdays", difficulty: "hard",   target_per_week: 5, goal_target: 1,   goal_unit: "" },
      { name: "Write code 2h",              category: "Focus",       frequency: "weekdays", difficulty: "hard",   target_per_week: 5, goal_target: 120, goal_unit: "min" },
      { name: "Read a tech article",        category: "Learning",    frequency: "daily",    difficulty: "easy",   target_per_week: 7, goal_target: 1,   goal_unit: "" },
      { name: "Exercise",                   category: "Fitness",     frequency: "daily",    difficulty: "medium", target_per_week: 5, goal_target: 30,  goal_unit: "min" },
      { name: "10 min reflection",          category: "Mindfulness", frequency: "daily",    difficulty: "easy",   target_per_week: 7, goal_target: 10,  goal_unit: "min" },
    ],
  },
];
