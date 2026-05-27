"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/* ---------- habits ---------- */

export async function addHabit(formData: FormData) {
  const { supabase, user } = await authed();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("habits").insert({
    user_id: user.id,
    name,
    category: String(formData.get("category") ?? "Health"),
    frequency: String(formData.get("frequency") ?? "daily"),
    difficulty: String(formData.get("difficulty") ?? "medium"),
    target_per_week: Number(formData.get("target_per_week") ?? 7),
    goal_target: Number(formData.get("goal_target") ?? 1),
    goal_unit: String(formData.get("goal_unit") ?? ""),
    reminder_time: String(formData.get("reminder_time") ?? "") || null,
    status: "active",
    active: true,
  });
  revalidatePath("/", "layout");
}

export async function updateHabit(habitId: string, formData: FormData) {
  const { supabase } = await authed();
  await supabase
    .from("habits")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      category: String(formData.get("category") ?? "Health"),
      frequency: String(formData.get("frequency") ?? "daily"),
      difficulty: String(formData.get("difficulty") ?? "medium"),
      target_per_week: Number(formData.get("target_per_week") ?? 7),
      goal_target: Number(formData.get("goal_target") ?? 1),
      goal_unit: String(formData.get("goal_unit") ?? ""),
      reminder_time: String(formData.get("reminder_time") ?? "") || null,
    })
    .eq("id", habitId);
  revalidatePath("/", "layout");
}

export async function setHabitStatus(habitId: string, status: "active" | "paused" | "archived") {
  const { supabase } = await authed();
  await supabase
    .from("habits")
    .update({ status, active: status === "active" })
    .eq("id", habitId);
  revalidatePath("/", "layout");
}

export async function toggleHabitDate(habitId: string, isoDay: string) {
  const { supabase, user } = await authed();
  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("logged_on", isoDay)
    .maybeSingle();
  if (existing) {
    await supabase.from("habit_logs").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("habit_logs")
      .insert({ habit_id: habitId, user_id: user.id, logged_on: isoDay });
  }
  revalidatePath("/", "layout");
}

export async function toggleHabitToday(habitId: string) {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await toggleHabitDate(habitId, iso);
}

export async function deleteHabit(habitId: string) {
  const { supabase } = await authed();
  await supabase.from("habits").delete().eq("id", habitId);
  revalidatePath("/", "layout");
}

/** Persist new ordering for a list of habit ids. */
export async function reorderHabits(orderedIds: string[]) {
  const { supabase } = await authed();
  // Update each row's display_order in sequence. Few rows; safe to await individually.
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from("habits").update({ display_order: idx + 1 }).eq("id", id),
    ),
  );
  revalidatePath("/", "layout");
}

/* ---------- daily journal ---------- */

export async function saveDailyNote(isoDay: string, content: string) {
  const { supabase, user } = await authed();
  if (!content.trim()) {
    await supabase
      .from("daily_notes")
      .delete()
      .eq("user_id", user.id)
      .eq("note_on", isoDay);
  } else {
    await supabase.from("daily_notes").upsert(
      {
        user_id: user.id,
        note_on: isoDay,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,note_on" },
    );
  }
  revalidatePath("/", "layout");
}
