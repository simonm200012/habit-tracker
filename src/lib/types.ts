export type Profile = {
  id: string;
  display_name: string | null;
  daily_calorie_goal: number;
  daily_protein_goal_g: number;
  daily_fiber_goal_g: number;
  daily_water_goal_ml: number;
};

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string;
  target_per_week: number;
  active: boolean;
  created_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  logged_on: string;
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
