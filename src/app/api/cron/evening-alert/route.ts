import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isAuthorizedCron } from "@/lib/cron";
import { sendPushTo } from "@/lib/webpush";
import { emailShell, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { addDays, currentStreak, groupLogs, isScheduled, isoDate } from "@/lib/habits";
import type { Habit } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Fires hourly. For users whose local-hour matches evening_alert_hour, flag streaks at risk today. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("forbidden", { status: 403 });

  try {
    const admin = createAdminClient();
    const nowUtc = new Date();
    const todayIso = isoDate(nowUtc);

    const { data: allPrefs } = await admin
      .from("notification_prefs")
      .select("user_id, evening_alert_email, evening_alert_push");

    const due = (allPrefs ?? []).filter(
      (p) => p.evening_alert_email || p.evening_alert_push,
    );

    if (due.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const userIds = due.map((p) => p.user_id as string);
    const [habitsRes, logsRes, vacRes, profilesRes, usersRes] = await Promise.all([
      admin.from("habits").select("*").in("user_id", userIds).eq("status", "active"),
      admin
        .from("habit_logs")
        .select("user_id, habit_id, logged_on")
        .in("user_id", userIds)
        .gte("logged_on", isoDate(addDays(nowUtc, -89))),
      admin.from("vacation_days").select("user_id, day").in("user_id", userIds),
      admin.from("profiles").select("id, display_name").in("id", userIds),
      admin.auth.admin.listUsers(),
    ]);

    const habitsByUser = new Map<string, Habit[]>();
    for (const h of (habitsRes.data ?? []) as Habit[]) {
      const a = habitsByUser.get(h.user_id) ?? [];
      a.push(h);
      habitsByUser.set(h.user_id, a);
    }
    const logsByHabit = groupLogs(logsRes.data ?? []);
    const vacByUser = new Map<string, Set<string>>();
    for (const v of vacRes.data ?? []) {
      const s = vacByUser.get(v.user_id as string) ?? new Set();
      s.add(v.day as string);
      vacByUser.set(v.user_id as string, s);
    }
    const profileByUser = new Map<string, { display_name: string | null }>();
    for (const p of profilesRes.data ?? []) profileByUser.set(p.id as string, { display_name: p.display_name as string | null });
    const emailByUser = new Map<string, string>();
    for (const u of usersRes.data?.users ?? []) if (u.id && u.email) emailByUser.set(u.id, u.email);

    let sent = 0;

    for (const pref of due) {
      const uid = pref.user_id as string;
      const habits = habitsByUser.get(uid) ?? [];
      const vac = vacByUser.get(uid) ?? new Set();
      // Streaks at risk today: scheduled, not done today, current streak >= 3
      const atRisk = habits
        .filter((h) => isScheduled(h, nowUtc) && !(logsByHabit.get(h.id)?.has(todayIso)))
        .map((h) => ({ h, streak: currentStreak(h, logsByHabit.get(h.id) ?? new Set(), nowUtc, vac) }))
        .filter((x) => x.streak >= 3)
        .sort((a, b) => b.streak - a.streak);

      if (atRisk.length === 0) continue;

      const name = profileByUser.get(uid)?.display_name ?? emailByUser.get(uid)?.split("@")[0] ?? "you";
      const email = emailByUser.get(uid);
      const top = atRisk[0];
      const title = `${atRisk.length} streak${atRisk.length === 1 ? "" : "s"} at risk`;
      const body = atRisk.length === 1
        ? `${top.h.name}: ${top.streak}-day streak ends at midnight if you don't check off.`
        : `${top.h.name} (${top.streak}d) + ${atRisk.length - 1} more end at midnight.`;

      if (pref.evening_alert_push) {
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", uid);
        for (const s of subs ?? []) {
          const r = await sendPushTo(s as { endpoint: string; p256dh: string; auth: string }, {
            title: `⚠️ ${title}`,
            body,
            url: "/dashboard",
            tag: `evening-${todayIso}`,
          });
          if (r.ok) sent++;
          else if (r.gone) await admin.from("push_subscriptions").delete().eq("endpoint", (s as { endpoint: string }).endpoint);
        }
      }

      if (pref.evening_alert_email && email && isEmailConfigured()) {
        const listHtml = atRisk
          .slice(0, 8)
          .map(({ h, streak }) => `<tr><td style="padding:8px 0;border-top:1px solid #f1f5f9;">
            🔥 <span style="color:#0f172a;font-weight:600;">${escapeHtml(h.name)}</span>
            <span style="color:#b45309;font-weight:700;"> · ${streak}-day streak</span>
            <span style="color:#64748b;font-size:12px;"> · ${escapeHtml(h.category)}</span>
          </td></tr>`)
          .join("");
        const html = emailShell(title, `
          <p style="font-size:14px;color:#b45309;margin:0 0 4px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Heads up</p>
          <h1 style="margin:0 0 12px;font-size:24px;color:#0f172a;letter-spacing:-0.02em;">${escapeHtml(title)}, ${escapeHtml(name)}.</h1>
          <p style="font-size:14px;color:#334155;margin:0 0 18px;">A quick check-off keeps the streak alive. It takes 30 seconds.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${listHtml}</table>
          <div style="margin-top:24px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/dashboard" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Open habit-tracker →</a>
          </div>
        `);
        const r = await sendEmail({ to: email, subject: `⚠️ ${atRisk.length} streak${atRisk.length === 1 ? "" : "s"} at risk tonight`, html });
        if (r.ok) sent++;
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

