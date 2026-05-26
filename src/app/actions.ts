"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function userId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/* ---------- habits ---------- */

export async function addHabit(formData: FormData) {
  const { supabase, user } = await userId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const target = Number(formData.get("target_per_week") ?? 7);
  await supabase.from("habits").insert({
    user_id: user.id,
    name,
    target_per_week: target,
    icon: String(formData.get("icon") ?? ""),
  });
  revalidatePath("/");
}

export async function toggleHabitToday(habitId: string) {
  const { supabase, user } = await userId();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("logged_on", today)
    .maybeSingle();

  if (existing) {
    await supabase.from("habit_logs").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("habit_logs")
      .insert({ habit_id: habitId, user_id: user.id, logged_on: today });
  }
  revalidatePath("/");
}

export async function deleteHabit(habitId: string) {
  const { supabase } = await userId();
  await supabase.from("habits").delete().eq("id", habitId);
  revalidatePath("/");
}

/* ---------- water ---------- */

export async function addWater(formData: FormData) {
  const { supabase, user } = await userId();
  const amount = Number(formData.get("amount_ml") ?? 0);
  if (amount <= 0) return;
  await supabase.from("water_logs").insert({ user_id: user.id, amount_ml: amount });
  revalidatePath("/");
}

/* ---------- food ---------- */

export async function addFood(formData: FormData) {
  const { supabase, user } = await userId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("food_logs").insert({
    user_id: user.id,
    name,
    calories: Number(formData.get("calories") ?? 0),
    protein_g: Number(formData.get("protein_g") ?? 0),
    fiber_g: Number(formData.get("fiber_g") ?? 0),
    carbs_g: Number(formData.get("carbs_g") ?? 0),
    fat_g: Number(formData.get("fat_g") ?? 0),
  });
  revalidatePath("/");
}

export async function deleteFood(id: string) {
  const { supabase } = await userId();
  await supabase.from("food_logs").delete().eq("id", id);
  revalidatePath("/");
}

/* ---------- profile / goals ---------- */

export async function updateGoals(formData: FormData) {
  const { supabase, user } = await userId();
  await supabase
    .from("profiles")
    .update({
      daily_calorie_goal: Number(formData.get("daily_calorie_goal") ?? 2000),
      daily_protein_goal_g: Number(formData.get("daily_protein_goal_g") ?? 150),
      daily_fiber_goal_g: Number(formData.get("daily_fiber_goal_g") ?? 30),
      daily_water_goal_ml: Number(formData.get("daily_water_goal_ml") ?? 2500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  revalidatePath("/");
}
