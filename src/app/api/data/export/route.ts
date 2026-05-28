import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GDPR data export. Returns a single JSON blob with everything we hold for
 * the authenticated user — habits, logs, journal, achievements unlocked,
 * preferences, subscriptions. Suitable for archival / portability.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const [
    habits,
    logs,
    notes,
    vacationDays,
    dailyQuests,
    notificationPrefs,
    publicProfile,
    shortcutTokens,
    pushSubs,
    partnerships,
    challenges,
    challengeMembers,
    subscription,
    profile,
  ] = await Promise.all([
    supabase.from("habits").select("*").eq("user_id", user.id),
    supabase.from("habit_logs").select("*").eq("user_id", user.id),
    supabase.from("daily_notes").select("*").eq("user_id", user.id),
    supabase.from("vacation_days").select("*").eq("user_id", user.id),
    supabase.from("daily_quests").select("*").eq("user_id", user.id),
    supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("public_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("shortcut_tokens").select("id, label, created_at, last_used_at").eq("user_id", user.id),
    supabase.from("push_subscriptions").select("id, user_agent, created_at").eq("user_id", user.id),
    supabase.from("partnerships").select("*").or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
    supabase.from("challenges").select("*").eq("creator_id", user.id),
    supabase.from("challenge_members").select("*").eq("user_id", user.id),
    supabase.from("subscriptions").select("status, current_period_end, cancel_at_period_end, created_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profile.data,
    habits: habits.data,
    habit_logs: logs.data,
    daily_notes: notes.data,
    vacation_days: vacationDays.data,
    daily_quests: dailyQuests.data,
    notification_prefs: notificationPrefs.data,
    public_profile: publicProfile.data,
    shortcut_tokens: shortcutTokens.data,
    push_subscriptions: pushSubs.data,
    partnerships: partnerships.data,
    challenges_created: challenges.data,
    challenges_joined: challengeMembers.data,
    subscription: subscription.data,
  };

  const filename = `habit-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
