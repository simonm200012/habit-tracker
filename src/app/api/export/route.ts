import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV<T extends Record<string, unknown>>(rows: T[], cols: (keyof T)[]): string {
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(",")).join("\n");
  return head + "\n" + body + "\n";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const [habitsRes, logsRes, notesRes, vacRes] = await Promise.all([
    supabase.from("habits").select("*").eq("user_id", user.id),
    supabase
      .from("habit_logs")
      .select("habit_id, logged_on, value, created_at")
      .eq("user_id", user.id),
    supabase.from("daily_notes").select("note_on, content").eq("user_id", user.id),
    supabase.from("vacation_days").select("day, reason").eq("user_id", user.id),
  ]);

  const habits = habitsRes.data ?? [];
  const habitNameById = new Map(habits.map((h) => [h.id as string, h.name as string]));

  // Build the multi-section CSV: habits, logs, notes, vacation_days
  const habitsCols = [
    "id", "name", "category", "frequency", "difficulty", "status",
    "target_per_week", "goal_target", "goal_unit", "reminder_time",
    "linked_to_habit_id", "display_order", "created_at",
  ] as const;
  const logsCols = ["habit_name", "logged_on", "value", "created_at"] as const;
  const notesCols = ["note_on", "content"] as const;
  const vacCols = ["day", "reason"] as const;

  type LogRow = { habit_id: string; logged_on: string; value: number | null; created_at: string | null };
  const logRows = (logsRes.data as LogRow[] | null ?? []).map((l) => ({
    habit_name: habitNameById.get(l.habit_id) ?? l.habit_id,
    logged_on: l.logged_on,
    value: l.value,
    created_at: l.created_at,
  }));

  const parts: string[] = [];
  parts.push("# habit-tracker export");
  parts.push(`# user_id: ${user.id}`);
  parts.push(`# generated_at: ${new Date().toISOString()}`);
  parts.push("");
  parts.push("# === habits ===");
  parts.push(toCSV(habits as Record<string, unknown>[], habitsCols as readonly (keyof Record<string, unknown>)[] as (keyof Record<string, unknown>)[]));
  parts.push("# === habit_logs ===");
  parts.push(toCSV(logRows as Record<string, unknown>[], logsCols as readonly (keyof Record<string, unknown>)[] as (keyof Record<string, unknown>)[]));
  parts.push("# === daily_notes ===");
  parts.push(toCSV((notesRes.data ?? []) as Record<string, unknown>[], notesCols as readonly (keyof Record<string, unknown>)[] as (keyof Record<string, unknown>)[]));
  parts.push("# === vacation_days ===");
  parts.push(toCSV((vacRes.data ?? []) as Record<string, unknown>[], vacCols as readonly (keyof Record<string, unknown>)[] as (keyof Record<string, unknown>)[]));

  const csv = parts.join("\n");
  const filename = `habit-tracker-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
