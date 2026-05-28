import { createClient } from "@/lib/supabase/server";

/**
 * Diagnostic page. Runs every query the app depends on and reports which work / which fail.
 * Hit /debug to see the exact missing column / table / RLS problem.
 */
export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; detail: string };

async function runChecks(): Promise<{ checks: Check[]; userId: string | null; email: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const email = user?.email ?? null;

  const checks: Check[] = [];

  async function probe(name: string, run: () => PromiseLike<unknown>) {
    try {
      const res = (await run()) as { error?: { message?: string } | null; data?: unknown; count?: number | null };
      if (res?.error) {
        checks.push({ name, ok: false, detail: res.error.message ?? String(res.error) });
      } else {
        const count = Array.isArray(res?.data)
          ? res.data.length
          : typeof res?.count === "number"
          ? res.count
          : res?.data
          ? 1
          : 0;
        checks.push({ name, ok: true, detail: `OK · returned ${count} row${count === 1 ? "" : "s"}` });
      }
    } catch (e) {
      checks.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  if (!userId) {
    checks.push({ name: "auth.getUser()", ok: false, detail: "No user session" });
    return { checks, userId, email };
  }

  // -------- Tables / columns --------
  await probe("habits  · all columns", () =>
    supabase.from("habits").select("id, name, category, frequency, difficulty, status, display_order, linked_to_habit_id, goal_target, goal_unit, reminder_time").limit(1),
  );
  await probe("habit_logs  · with value column (migration 005)", () =>
    supabase.from("habit_logs").select("habit_id, logged_on, value").limit(1),
  );
  await probe("habit_logs  · basic", () =>
    supabase.from("habit_logs").select("habit_id, logged_on").limit(1),
  );
  await probe("profiles  · display_name", () =>
    supabase.from("profiles").select("display_name").limit(1),
  );
  await probe("vacation_days (migration 004)", () =>
    supabase.from("vacation_days").select("day").limit(1),
  );
  await probe("daily_notes (migration 003)", () =>
    supabase.from("daily_notes").select("content").limit(1),
  );
  await probe("public_profiles (migration 006)", () =>
    supabase.from("public_profiles").select("slug").limit(1),
  );
  await probe("partnerships (migration 006)", () =>
    supabase.from("partnerships").select("user_a").limit(1),
  );
  await probe("partner_invites (migration 006)", () =>
    supabase.from("partner_invites").select("code").limit(1),
  );
  await probe("challenges (migration 006)", () =>
    supabase.from("challenges").select("id").limit(1),
  );
  await probe("challenge_members (migration 006)", () =>
    supabase.from("challenge_members").select("user_id").limit(1),
  );

  // -------- Counts (what does the user actually have?) --------
  await probe("habits · count active for THIS user", () =>
    supabase
      .from("habits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active"),
  );

  return { checks, userId, email };
}

export default async function DebugPage() {
  const { checks, userId, email } = await runChecks();
  const failed = checks.filter((c) => !c.ok);

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-3xl mx-auto">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Diagnostic</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">/debug</h1>
        <p className="text-slate-600 text-sm mt-1">
          Lists every query the app makes and whether it works. Paste failures to fix the issue.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Authenticated as</p>
        <p className="text-sm font-mono text-slate-900 mt-1">{email ?? "<not signed in>"}</p>
        <p className="text-[11px] font-mono text-slate-500 mt-0.5 break-all">
          {userId ?? "no user id"}
        </p>
      </div>

      <div className={`rounded-2xl ring-1 p-5 mb-5 ${failed.length === 0 ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"}`}>
        <p className="font-bold text-slate-900 tracking-tight">
          {failed.length === 0
            ? `✅ All ${checks.length} checks passing`
            : `❌ ${failed.length} of ${checks.length} checks failing`}
        </p>
        {failed.length > 0 && (
          <p className="text-xs text-slate-700 mt-1">
            Each failure below shows the exact Postgres / Supabase error.
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {checks.map((c) => (
          <li
            key={c.name}
            className={`p-3 rounded-xl ring-1 flex items-start gap-3 ${
              c.ok ? "bg-white ring-slate-200" : "bg-rose-50 ring-rose-200"
            }`}
          >
            <span className={`text-lg ${c.ok ? "text-emerald-600" : "text-rose-600"}`}>
              {c.ok ? "✓" : "✗"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 font-mono">{c.name}</p>
              <p className={`text-xs mt-1 font-mono break-all ${c.ok ? "text-slate-600" : "text-rose-800"}`}>
                {c.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
