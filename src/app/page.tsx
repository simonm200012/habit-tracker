import { createClient } from "@/lib/supabase/server";
import { logout } from "./login/actions";
import { HabitsCard } from "@/components/HabitsCard";
import { WaterCard } from "@/components/WaterCard";
import { NutritionCard } from "@/components/NutritionCard";
import { GoalsCard } from "@/components/GoalsCard";
import type { Profile, Habit, FoodLog } from "@/lib/types";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // middleware redirects unauthenticated users; this narrows the type
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);

  const [profileRes, habitsRes, habitLogsRes, waterRes, foodRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("habits").select("*").eq("active", true).order("created_at"),
    supabase.from("habit_logs").select("habit_id").eq("logged_on", today),
    supabase.from("water_logs").select("amount_ml").eq("logged_on", today),
    supabase
      .from("food_logs")
      .select("*")
      .eq("logged_on", today)
      .order("logged_at", { ascending: false }),
  ]);

  const profile: Profile = profileRes.data ?? {
    id: user.id,
    display_name: null,
    daily_calorie_goal: 2000,
    daily_protein_goal_g: 150,
    daily_fiber_goal_g: 30,
    daily_water_goal_ml: 2500,
  };
  const habits = (habitsRes.data ?? []) as Habit[];
  const doneToday = new Set(
    (habitLogsRes.data ?? []).map((r) => r.habit_id as string),
  );
  const waterTotal = (waterRes.data ?? []).reduce(
    (s, r) => s + (r.amount_ml ?? 0),
    0,
  );
  const foods = (foodRes.data ?? []) as FoodLog[];

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">habit-tracker</h1>
            <p className="text-xs text-neutral-500">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600 hidden sm:inline">
              {profile.display_name ?? user.email}
            </span>
            <form action={logout}>
              <button className="text-sm px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-3">
        <HabitsCard habits={habits} doneToday={doneToday} />
        <WaterCard total={waterTotal} goal={profile.daily_water_goal_ml} />
        <GoalsCard profile={profile} />
        <NutritionCard foods={foods} profile={profile} />
      </div>
    </main>
  );
}
