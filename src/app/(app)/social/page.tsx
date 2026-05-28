import { createClient } from "@/lib/supabase/server";
import { addDays, currentStreak, groupLogs, isoDate } from "@/lib/habits";
import { PublicProfileForm } from "@/components/social/PublicProfileForm";
import { PartnerSection } from "@/components/social/PartnerSection";
import { ChallengesSection } from "@/components/social/ChallengesSection";
import type { Challenge, Habit, PublicProfile } from "@/lib/types";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const startWindow = addDays(today, -89);

  const [profileRes, partnershipsRes, inviteRes, challengeIdsRes] = await Promise.all([
    supabase.from("public_profiles").select("*").eq("user_id", user.id).maybeSingle<PublicProfile>(),
    supabase
      .from("partnerships")
      .select("user_a, user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
    supabase
      .from("partner_invites")
      .select("code, expires_at")
      .eq("from_user", user.id)
      .is("redeemed_by", null)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("challenge_members")
      .select("challenge_id")
      .eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
  const partnerIds = (partnershipsRes.data ?? [])
    .map((p) => (p.user_a === user.id ? p.user_b : p.user_a) as string);

  // Resolve partner names + their active streaks
  let partnerRows: { user_id: string; display_name: string | null; slug: string | null; activeStreaks: number }[] = [];
  if (partnerIds.length > 0) {
    const [partnerProfilesRes, partnerHabitsRes, partnerLogsRes] = await Promise.all([
      supabase
        .from("public_profiles")
        .select("user_id, slug, display_name")
        .in("user_id", partnerIds),
      supabase
        .from("habits")
        .select("id, user_id, frequency")
        .in("user_id", partnerIds)
        .eq("status", "active"),
      supabase
        .from("habit_logs")
        .select("habit_id, logged_on, user_id")
        .in("user_id", partnerIds)
        .gte("logged_on", isoDate(startWindow)),
    ]);
    const profByUid = new Map(
      (partnerProfilesRes.data ?? []).map((p) => [
        p.user_id as string,
        { slug: p.slug as string | null, display_name: p.display_name as string | null },
      ]),
    );
    const habitsByUid = new Map<string, Habit[]>();
    for (const h of (partnerHabitsRes.data ?? []) as Habit[]) {
      const arr = habitsByUid.get(h.user_id) ?? [];
      arr.push(h);
      habitsByUid.set(h.user_id, arr);
    }
    const logsByHabit = groupLogs(partnerLogsRes.data ?? []);

    partnerRows = partnerIds.map((uid) => {
      const habits = habitsByUid.get(uid) ?? [];
      const activeStreaks = habits.reduce(
        (s, h) => s + currentStreak(h, logsByHabit.get(h.id) ?? new Set(), today),
        0,
      );
      const p = profByUid.get(uid);
      return {
        user_id: uid,
        display_name: p?.display_name ?? null,
        slug: p?.slug ?? null,
        activeStreaks,
      };
    });
  }

  // Challenges I'm in
  const challengeIds = (challengeIdsRes.data ?? []).map((r) => r.challenge_id as string);
  const challenges = challengeIds.length > 0
    ? ((
        await supabase
          .from("challenges")
          .select("*")
          .in("id", challengeIds)
          .order("starts_on", { ascending: false })
      ).data as Challenge[] ?? [])
    : [];

  // Per-challenge stats
  let challengeRows: { challenge: Challenge; memberCount: number; myProgress: number; daysLeft: number }[] = [];
  if (challenges.length > 0) {
    const [memberCountsRes, myHabitsRes, myLogsRes] = await Promise.all([
      supabase
        .from("challenge_members")
        .select("challenge_id, user_id")
        .in("challenge_id", challenges.map((c) => c.id)),
      supabase
        .from("habits")
        .select("id, category")
        .eq("user_id", user.id),
      supabase
        .from("habit_logs")
        .select("habit_id, logged_on")
        .eq("user_id", user.id),
    ]);
    const countsByChallenge = new Map<string, number>();
    for (const m of memberCountsRes.data ?? []) {
      const k = m.challenge_id as string;
      countsByChallenge.set(k, (countsByChallenge.get(k) ?? 0) + 1);
    }
    const myHabitsByCat = new Map<string, Set<string>>();
    for (const h of myHabitsRes.data ?? []) {
      const cat = h.category as string;
      const set = myHabitsByCat.get(cat) ?? new Set<string>();
      set.add(h.id as string);
      myHabitsByCat.set(cat, set);
    }

    challengeRows = challenges.map((c) => {
      const start = c.starts_on;
      const end = c.ends_on;
      const todayIso = isoDate(today);
      const effEnd = todayIso < end ? todayIso : end;
      const startDate = new Date(start);
      const endDate = new Date(end);
      const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
      const elapsed = Math.max(0, Math.round((Math.min(today.getTime(), endDate.getTime()) - startDate.getTime()) / 86400000) + 1);
      const daysLeft = Math.max(0, totalDays - elapsed);

      const myHabits = myHabitsByCat.get(c.category) ?? new Set();
      const myCount = (myLogsRes.data ?? []).filter(
        (r) => myHabits.has(r.habit_id as string)
          && (r.logged_on as string) >= start
          && (r.logged_on as string) <= effEnd,
      ).length;
      const myProgress = Math.min(100, Math.round((myCount / totalDays) * 100));

      return {
        challenge: c,
        memberCount: countsByChallenge.get(c.id) ?? 0,
        myProgress,
        daysLeft,
      };
    });
  }

  // Base URL for share links
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3030";
  const baseUrl = `${proto}://${host}`;
  const baseShareUrl = `${baseUrl}/social?invite=`;

  const myActiveInviteCode = inviteRes.data?.[0]?.code ?? null;

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Social</h1>
        <p className="text-slate-600 text-sm mt-1">
          Share your progress, accountability partners, group challenges.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <PublicProfileForm profile={profile} baseUrl={baseUrl} />
        <PartnerSection
          partners={partnerRows}
          myInviteCode={myActiveInviteCode}
          baseShareUrl={baseShareUrl}
        />
        <div className="lg:col-span-2">
          <ChallengesSection rows={challengeRows} />
        </div>
      </div>
    </main>
  );
}
