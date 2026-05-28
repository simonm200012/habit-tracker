import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryMeta } from "@/lib/categories";
import { addDays, dateRange, groupLogs, isoDate } from "@/lib/habits";
import { InviteCodeCard } from "@/components/social/InviteCodeCard";
import { LeaveChallengeButton } from "@/components/social/LeaveChallengeButton";
import type { Challenge, Habit } from "@/lib/types";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [chRes, membersRes] = await Promise.all([
    supabase.from("challenges").select("*").eq("id", id).maybeSingle<Challenge>(),
    supabase.from("challenge_members").select("user_id, joined_at").eq("challenge_id", id),
  ]);

  if (!chRes.data) notFound();
  const challenge = chRes.data;
  const memberIds = (membersRes.data ?? []).map((m) => m.user_id as string);
  const amMember = memberIds.includes(user.id);

  // Member profiles (best-effort: pull public_profiles where available)
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("user_id, slug, display_name")
    .in("user_id", memberIds.length > 0 ? memberIds : [user.id]);
  const profileByUser = new Map<string, { slug: string | null; display_name: string | null }>();
  for (const p of profiles ?? []) {
    profileByUser.set(p.user_id as string, {
      slug: p.slug as string | null,
      display_name: p.display_name as string | null,
    });
  }

  // Per-member habit_log counts in window matching the category
  const startIso = challenge.starts_on;
  const endIso = challenge.ends_on;
  const today = new Date();
  const todayIso = isoDate(today);
  const effectiveEnd = todayIso < endIso ? todayIso : endIso;

  // Pull all relevant habits + logs in one go (RLS via challenge co-membership)
  const [habitsRes, logsRes] = await Promise.all([
    supabase
      .from("habits")
      .select("id, user_id, name, category, frequency")
      .in("user_id", memberIds.length > 0 ? memberIds : [user.id])
      .eq("category", challenge.category),
    supabase
      .from("habit_logs")
      .select("habit_id, user_id, logged_on")
      .gte("logged_on", startIso)
      .lte("logged_on", effectiveEnd),
  ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const habitIds = new Set(habits.map((h) => h.id));
  const userByHabit = new Map(habits.map((h) => [h.id, h.user_id]));

  // Count check-offs per user in category
  const tallyByUser = new Map<string, number>();
  for (const r of logsRes.data ?? []) {
    if (!habitIds.has(r.habit_id)) continue;
    const u = userByHabit.get(r.habit_id) ?? (r.user_id as string);
    tallyByUser.set(u, (tallyByUser.get(u) ?? 0) + 1);
  }

  // Build leaderboard
  type Row = {
    userId: string;
    name: string;
    slug: string | null;
    count: number;
    isYou: boolean;
  };
  const rows: Row[] = memberIds.map((uid) => {
    const p = profileByUser.get(uid);
    return {
      userId: uid,
      name: p?.display_name ?? p?.slug ?? (uid === user.id ? "You" : "Anonymous"),
      slug: p?.slug ?? null,
      count: tallyByUser.get(uid) ?? 0,
      isYou: uid === user.id,
    };
  });
  rows.sort((a, b) => b.count - a.count);

  // Day-by-day grid (for visual race)
  const days = dateRange(new Date(startIso), new Date(effectiveEnd));
  const daysTotal = dateRange(new Date(startIso), new Date(endIso)).length;
  const daysElapsed = days.length;
  const daysLeft = Math.max(0, daysTotal - daysElapsed);

  const cat = categoryMeta(challenge.category);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const isCreator = challenge.creator_id === user.id;
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
      <Link
        href="/social"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4 transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Social hub
      </Link>

      <div className="flex items-start gap-4 mb-7 flex-wrap">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-1 ${cat.bg} ${cat.ring} shrink-0`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
            <path d={cat.icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
            {challenge.category} · {memberIds.length} member{memberIds.length === 1 ? "" : "s"}
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">{challenge.name}</h1>
          {challenge.description && (
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">{challenge.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {amMember && !isCreator && <LeaveChallengeButton challengeId={challenge.id} />}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Day</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
            {daysElapsed}<span className="text-lg text-slate-400 font-semibold">/{daysTotal}</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Days left</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">{daysLeft}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total check-offs</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
            {rows.reduce((s, r) => s + r.count, 0)}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your rank</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
            #{rows.findIndex((r) => r.isYou) + 1 || "—"}<span className="text-lg text-slate-400 font-semibold"> / {rows.length}</span>
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Leaderboard */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 lg:col-span-2">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Leaderboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Counting {challenge.category} check-offs in window
            </p>
          </div>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li
                key={r.userId}
                className={`flex items-center gap-3 p-3 rounded-xl ring-1 transition ${
                  r.isYou
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-slate-50 ring-slate-200"
                }`}
              >
                <span className={`text-lg font-extrabold tabular-nums w-7 text-center ${r.isYou ? "text-amber-300" : "text-slate-400"}`}>
                  {i === 0 ? "🏆" : `#${i + 1}`}
                </span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${r.isYou ? "bg-white/20 text-white" : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700"}`}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${r.isYou ? "text-white" : "text-slate-900"}`}>
                    {r.name}{r.isYou && " (you)"}
                  </p>
                  {r.slug && (
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${r.isYou ? "text-slate-300" : "text-slate-500"}`}>
                      /u/{r.slug}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 w-40">
                  <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${r.isYou ? "bg-white/20" : "bg-slate-200"}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${r.isYou ? "bg-amber-400" : "bg-slate-700"}`}
                      style={{ width: `${(r.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className={`font-bold tabular-nums w-8 text-right ${r.isYou ? "text-amber-300" : "text-slate-900"}`}>
                    {r.count}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Invite */}
        <section className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
            <h2 className="text-base font-bold text-slate-900 tracking-tight mb-3">Invite friends</h2>
            <InviteCodeCard
              code={challenge.invite_code}
              label="Challenge code"
              description="Anyone with this code can join the challenge."
              shareUrl={`${baseUrl}/social?join=`}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-2">How scoring works</h3>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li>· Each member's check-offs on any <b className="text-slate-900">{challenge.category}</b> habit count once per day.</li>
              <li>· The window is <b className="text-slate-900 tabular-nums">{daysTotal} days</b>.</li>
              <li>· Rankings update live as everyone logs.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
