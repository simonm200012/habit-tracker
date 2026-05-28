import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isAuthorizedCron } from "@/lib/cron";
import { sendPushTo } from "@/lib/webpush";
import { emailShell, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { addDays, isScheduled, isoDate } from "@/lib/habits";
import type { Habit } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Runs hourly (or whatever Vercel cron schedule you set) and dispatches the
 * morning brief to each user whose local-hour now matches their preference.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("forbidden", { status: 403 });

  try {
    const admin = createAdminClient();

    const nowUtc = new Date();
    const todayIso = isoDate(nowUtc);

    // Vercel Hobby cron runs once daily at a fixed UTC time, so we send to all
    // opted-in users (the per-user "preferred hour" field is informational only
    // unless you upgrade to Pro + an hourly cron schedule).
    const { data: allPrefs } = await admin
      .from("notification_prefs")
      .select("user_id, morning_brief_email, morning_brief_push");

    const due = (allPrefs ?? []).filter(
      (p) => p.morning_brief_email || p.morning_brief_push,
    );

    if (due.length === 0) return NextResponse.json({ ok: true, sent: 0, skipped: "no users opted in" });

    const userIds = due.map((p) => p.user_id as string);

    // 2) Resolve user info + habits + today's logs in bulk
    const [habitsRes, logsRes, profilesRes, usersRes] = await Promise.all([
      admin
        .from("habits")
        .select("*")
        .in("user_id", userIds)
        .eq("status", "active"),
      admin
        .from("habit_logs")
        .select("user_id, habit_id, logged_on")
        .in("user_id", userIds)
        .eq("logged_on", todayIso),
      admin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds),
      admin.auth.admin.listUsers(),
    ]);

    const habitsByUser = new Map<string, Habit[]>();
    for (const h of (habitsRes.data ?? []) as Habit[]) {
      const arr = habitsByUser.get(h.user_id) ?? [];
      arr.push(h);
      habitsByUser.set(h.user_id, arr);
    }
    const doneByUser = new Map<string, Set<string>>();
    for (const l of logsRes.data ?? []) {
      const s = doneByUser.get(l.user_id as string) ?? new Set();
      s.add(l.habit_id as string);
      doneByUser.set(l.user_id as string, s);
    }
    const profileByUser = new Map<string, { display_name: string | null }>();
    for (const p of profilesRes.data ?? []) profileByUser.set(p.id as string, { display_name: p.display_name as string | null });
    const emailByUser = new Map<string, string>();
    for (const u of usersRes.data?.users ?? []) {
      if (u.id && u.email) emailByUser.set(u.id, u.email);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const pref of due) {
      const uid = pref.user_id as string;
      const habits = habitsByUser.get(uid) ?? [];
      const todaysHabits = habits.filter((h) => isScheduled(h, nowUtc));
      const done = doneByUser.get(uid) ?? new Set();
      const remaining = todaysHabits.filter((h) => !done.has(h.id));
      const name = profileByUser.get(uid)?.display_name ?? emailByUser.get(uid)?.split("@")[0] ?? "you";
      const email = emailByUser.get(uid);

      const title = `Good morning, ${name}`;
      const body = remaining.length === 0
        ? `All ${todaysHabits.length} habits done already. Coast through your day.`
        : `${remaining.length} of ${todaysHabits.length} habits to go: ${remaining.slice(0, 3).map((h) => h.name).join(", ")}${remaining.length > 3 ? "…" : ""}`;

      // Push
      if (pref.morning_brief_push) {
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", uid);
        for (const s of subs ?? []) {
          const r = await sendPushTo(s as { endpoint: string; p256dh: string; auth: string }, {
            title,
            body,
            url: "/dashboard",
            tag: `morning-${todayIso}`,
          });
          if (r.ok) sent++;
          else if (r.gone) await admin.from("push_subscriptions").delete().eq("endpoint", (s as { endpoint: string }).endpoint);
          else if (r.error) errors.push(r.error);
        }
      }

      // Email
      if (pref.morning_brief_email && email && isEmailConfigured()) {
        const listHtml = todaysHabits
          .map((h) => `<tr><td style="padding:6px 0;border-top:1px solid #f1f5f9;">
            ${done.has(h.id) ? "✅" : "⬜"} <span style="${done.has(h.id) ? "text-decoration:line-through;color:#94a3b8;" : "color:#0f172a;font-weight:600;"}">${escapeHtml(h.name)}</span>
            <span style="color:#64748b;font-size:12px;"> · ${escapeHtml(h.category)}${h.reminder_time ? ` · ${h.reminder_time.slice(0, 5)}` : ""}</span>
          </td></tr>`)
          .join("");
        const html = emailShell(title, `
          <p style="font-size:14px;color:#475569;margin:0 0 4px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">${nowUtc.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 style="margin:0 0 12px;font-size:24px;color:#0f172a;letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
          <p style="font-size:14px;color:#334155;margin:0 0 18px;">${escapeHtml(body)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${listHtml}</table>
          <div style="margin-top:24px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/dashboard" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Open habit-tracker →</a>
          </div>
        `);
        const r = await sendEmail({ to: email, subject: `Morning brief · ${nowUtc.toLocaleDateString("en", { month: "short", day: "numeric" })}`, html });
        if (r.ok) sent++;
        else if (r.error) errors.push(r.error);
      }
    }

    return NextResponse.json({ ok: true, sent, errors: errors.slice(0, 5) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

