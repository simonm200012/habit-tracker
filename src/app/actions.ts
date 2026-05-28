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

/** Set a numeric value for a habit on a given date. Upserts. Passing null/0 clears the log. */
export async function setHabitValue(habitId: string, isoDay: string, value: number | null) {
  const { supabase, user } = await authed();

  if (value === null || isNaN(value) || value <= 0) {
    await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("logged_on", isoDay);
  } else {
    await supabase.from("habit_logs").upsert(
      {
        habit_id: habitId,
        user_id: user.id,
        logged_on: isoDay,
        value,
      },
      { onConflict: "habit_id,logged_on" },
    );
  }
  revalidatePath("/", "layout");
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

/* ---------- templates / bulk import ---------- */

import { TEMPLATES } from "@/lib/templates";

export async function applyTemplate(templateId: string): Promise<{ inserted: number }> {
  const { supabase, user } = await authed();
  const tpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) throw new Error("Template not found");

  // Find current max display_order
  const { data: existing } = await supabase
    .from("habits")
    .select("display_order")
    .eq("user_id", user.id)
    .order("display_order", { ascending: false })
    .limit(1);
  const baseOrder = (existing?.[0]?.display_order ?? 0) + 1;

  const rows = tpl.habits.map((h, i) => ({
    user_id: user.id,
    name: h.name,
    category: h.category,
    frequency: h.frequency,
    difficulty: h.difficulty,
    target_per_week: h.target_per_week,
    goal_target: h.goal_target,
    goal_unit: h.goal_unit,
    display_order: baseOrder + i,
    status: "active",
    active: true,
  }));

  const { data: inserted, error } = await supabase
    .from("habits")
    .insert(rows)
    .select("id");

  if (error) {
    // Surface the real reason (RLS, missing column, constraint…) to the client
    throw new Error(`Insert failed: ${error.message}`);
  }
  if (!inserted || inserted.length === 0) {
    throw new Error("No habits were created (insert returned empty result).");
  }

  revalidatePath("/habits", "page");
  revalidatePath("/dashboard", "page");
  revalidatePath("/", "layout");

  return { inserted: inserted.length };
}

/* ---------- vacation / skip days ---------- */

export async function toggleVacationDay(isoDay: string) {
  const { supabase, user } = await authed();
  const { data: existing } = await supabase
    .from("vacation_days")
    .select("day")
    .eq("user_id", user.id)
    .eq("day", isoDay)
    .maybeSingle();
  if (existing) {
    await supabase.from("vacation_days").delete().eq("user_id", user.id).eq("day", isoDay);
  } else {
    await supabase.from("vacation_days").insert({ user_id: user.id, day: isoDay, reason: "" });
  }
  revalidatePath("/", "layout");
}

/* ---------- habit stacking ---------- */

export async function setHabitStack(habitId: string, linkedToId: string | null) {
  const { supabase } = await authed();
  await supabase
    .from("habits")
    .update({ linked_to_habit_id: linkedToId })
    .eq("id", habitId);
  revalidatePath("/", "layout");
}

/* ---------- account ---------- */

export async function updateDisplayName(formData: FormData) {
  const { supabase, user } = await authed();
  const raw = String(formData.get("display_name") ?? "").trim();
  // 1-40 chars, no extra normalization; null clears the name
  const display_name = raw === "" ? null : raw.slice(0, 40);
  await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  // Also keep auth user_metadata in sync so it travels with the session
  await supabase.auth.updateUser({
    data: { display_name },
  });
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
