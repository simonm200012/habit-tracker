export type Profile = {
  id: string;
  display_name: string | null;
  daily_calorie_goal: number;
  daily_protein_goal_g: number;
  daily_fiber_goal_g: number;
  daily_water_goal_ml: number;
};

export type HabitCategory =
  | "Health"
  | "Fitness"
  | "Focus"
  | "Learning"
  | "Finance"
  | "Mindfulness";

export type HabitFrequency = "daily" | "weekdays" | "weekly";
export type HabitDifficulty = "easy" | "medium" | "hard";
export type HabitStatus = "active" | "paused" | "archived";

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string;
  target_per_week: number;
  active: boolean;
  category: HabitCategory;
  frequency: HabitFrequency;
  difficulty: HabitDifficulty;
  status: HabitStatus;
  reminder_time: string | null;
  goal_target: number;
  goal_unit: string;
  display_order: number;
  linked_to_habit_id: string | null;
  created_at: string;
};

export type VacationDay = {
  user_id: string;
  day: string;
  reason: string;
};

export type PublicProfile = {
  user_id: string;
  slug: string;
  display_name: string | null;
  bio: string;
  is_public: boolean;
  show_streaks: boolean;
  show_achievements: boolean;
  updated_at: string;
};

export type Partnership = {
  user_a: string;
  user_b: string;
  accepted_at: string;
};

export type Challenge = {
  id: string;
  name: string;
  description: string;
  category: HabitCategory;
  starts_on: string;
  ends_on: string;
  creator_id: string;
  invite_code: string;
  created_at: string;
};

export type ChallengeMember = {
  challenge_id: string;
  user_id: string;
  joined_at: string;
};

export type DailyNote = {
  id: string;
  user_id: string;
  note_on: string;
  content: string;
  updated_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  logged_on: string;
  value: number | null;
};

export type WaterLog = {
  id: string;
  amount_ml: number;
  logged_at: string;
  logged_on: string;
};

export type FoodLog = {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  fiber_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
  logged_on: string;
};
