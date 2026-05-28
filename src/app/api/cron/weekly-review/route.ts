import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isAuthorizedCron } from "@/lib/cron";
import { sendPushTo } from "@/lib/webpush";
import { emailShell, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { addDays, dateRange, groupLogs, isScheduled, isoDate } from "@/lib/habits";
import type { Habit } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Fires on Sundays at 6pm local. Sends the week's recap. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return new NextResponse("forbidden", { status: 403 });

  try {
    const admin = createAdminClient();
    const nowUtc = new Date();

    const { data: allPrefs } = await admin
      .from("notification_prefs")
      .select("user_id, weekly_review_email, weekly_review_push");

    const due = (allPrefs ?? []).filter(
      (p) => p.weekly_review_email || p.weekly_review_push,
    );

    if (due.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const userIds = due.map((p) => p.user_id as string);

    // Range: last 7 days inclusive ending today
    const start = addDays(nowUtc, -6);
    const startIso = isoDate(start);
    const todayIso = isoDate(nowUtc);

    const [habitsRes, logsRes, vacRes, profilesRes, usersRes] = await Promise.all([
      admin.from("habits").select("*").in("user_id", userIds).eq("status", "active"),
      admin
        .from("habit_logs")
        .select("user_id, habit_id, logged_on")
        .in("user_id", userIds)
        .gte("logged_on", startIso)
        .lte("logged_on", todayIso),
      admin
        .from("vacation_days")
        .select("user_id, day")
        .in("user_id", userIds)
        .gte("day", startIso),
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

      let scheduled = 0;
      let completed = 0;
      for (const iso of dateRange(start, nowUtc)) {
        if (vac.has(iso)) continue;
        const d = new Date(iso);
        for (const h of habits) {
          if (!isScheduled(h, d)) continue;
          scheduled += 1;
          if (logsByHabit.get(h.id)?.has(iso)) completed += 1;
        }
      }
      const rate = scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);

      const name = profileByUser.get(uid)?.display_name ?? emailByUser.get(uid)?.split("@")[0] ?? "you";
      const email = emailByUser.get(uid);
      const title = `This week: ${rate}% completion`;
      const body = `${completed} of ${scheduled} habits done. ${rate >= 80 ? "Strong week." : rate >= 50 ? "Solid effort." : "Reset and try again."}`;

      if (pref.weekly_review_push) {
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", uid);
        for (const s of subs ?? []) {
          const r = await sendPushTo(s as { endpoint: string; p256dh: string; auth: string }, {
            title,
            body,
            url: "/review",
            tag: `weekly-${todayIso}`,
          });
          if (r.ok) sent++;
          else if (r.gone) await admin.from("push_subscriptions").delete().eq("endpoint", (s as { endpoint: string }).endpoint);
        }
      }

      if (pref.weekly_review_email && email && isEmailConfigured()) {
        const html = emailShell(title, `
          <p style="font-size:14px;color:#475569;margin:0 0 4px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Weekly review</p>
          <h1 style="margin:0 0 12px;font-size:28px;color:#0f172a;letter-spacing:-0.02em;">${escapeHtml(name)}, here's how the week went.</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;color:#ffffff;border-radius:14px;padding:16px;margin:18px 0;">
            <tr>
              <td width="33%" style="padding:12px;color:#94a3b8;font-size:11px;letter-spacing:.04em;text-transform:uppercase;font-weight:700;">Completion<br/><span style="color:#ffffff;font-size:32px;font-weight:900;">${rate}%</span></td>
              <td width="33%" style="padding:12px;color:#94a3b8;font-size:11px;letter-spacing:.04em;text-transform:uppercase;font-weight:700;">Done<br/><span style="color:#ffffff;font-size:32px;font-weight:900;">${completed}</span></td>
              <td width="33%" style="padding:12px;color:#94a3b8;font-size:11px;letter-spacing:.04em;text-transform:uppercase;font-weight:700;">Of<br/><span style="color:#ffffff;font-size:32px;font-weight:900;">${scheduled}</span></td>
            </tr>
          </table>
          <p style="font-size:14px;color:#334155;margin:0 0 18px;">${escapeHtml(body)}</p>
          <div style="margin-top:24px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/review" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Full weekly review →</a>
          </div>
        `);
        const r = await sendEmail({ to: email, subject: `Weekly review · ${rate}% completion`, html });
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

