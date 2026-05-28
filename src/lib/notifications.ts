/**
 * Shared digest builders + dispatch. Used by both the daily cron routes and
 * the in-app "Send test now" endpoint so the user experiences exactly what
 * will land in their inbox/notifications when the cron fires.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, currentStreak, dateRange, groupLogs, isScheduled, isoDate } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import { emailShell, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { sendPushTo } from "@/lib/webpush";

export type DigestPayload = {
  title: string;
  body: string;
  pushTag: string;
  pushUrl: string;
  emailSubject: string;
  emailHtml: string;
};

type UserContext = {
  userId: string;
  displayName: string;
  email: string | null;
};

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL ?? "";

/* ============================================================
 * Digest builders — pure: take data, return payload.
 * ============================================================ */

export async function buildMorningBrief(
  admin: SupabaseClient,
  ctx: UserContext,
): Promise<DigestPayload> {
  const nowUtc = new Date();
  const todayIso = isoDate(nowUtc);

  const [{ data: habits }, { data: logs }] = await Promise.all([
    admin.from("habits").select("*").eq("user_id", ctx.userId).eq("status", "active"),
    admin
      .from("habit_logs")
      .select("habit_id, logged_on")
      .eq("user_id", ctx.userId)
      .eq("logged_on", todayIso),
  ]);

  const all = (habits ?? []) as Habit[];
  const todaysHabits = all.filter((h) => isScheduled(h, nowUtc));
  const done = new Set((logs ?? []).map((l) => l.habit_id as string));
  const remaining = todaysHabits.filter((h) => !done.has(h.id));

  const title = `Good morning, ${ctx.displayName}`;
  const body =
    remaining.length === 0
      ? `All ${todaysHabits.length} habits done already. Coast through your day.`
      : `${remaining.length} of ${todaysHabits.length} habits to go: ${remaining
          .slice(0, 3)
          .map((h) => h.name)
          .join(", ")}${remaining.length > 3 ? "…" : ""}`;

  const listHtml = todaysHabits
    .map(
      (h) => `<tr><td style="padding:6px 0;border-top:1px solid #f1f5f9;">
        ${done.has(h.id) ? "✅" : "⬜"}
        <span style="${done.has(h.id) ? "text-decoration:line-through;color:#94a3b8;" : "color:#0f172a;font-weight:600;"}">${escapeHtml(h.name)}</span>
        <span style="color:#64748b;font-size:12px;"> · ${escapeHtml(h.category)}${h.reminder_time ? ` · ${h.reminder_time.slice(0, 5)}` : ""}</span>
      </td></tr>`,
    )
    .join("");

  const html = emailShell(
    title,
    `<p style="font-size:14px;color:#475569;margin:0 0 4px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">${nowUtc.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</p>
     <h1 style="margin:0 0 12px;font-size:24px;color:#0f172a;letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
     <p style="font-size:14px;color:#334155;margin:0 0 18px;">${escapeHtml(body)}</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${listHtml || '<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;">No habits scheduled for today.</td></tr>'}</table>
     <div style="margin-top:24px;">
       <a href="${baseUrl()}/dashboard" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Open habit-tracker →</a>
     </div>`,
  );

  return {
    title,
    body,
    pushTag: `morning-${todayIso}`,
    pushUrl: "/dashboard",
    emailSubject: `Morning brief · ${nowUtc.toLocaleDateString("en", { month: "short", day: "numeric" })}`,
    emailHtml: html,
  };
}

export async function buildEveningAlert(
  admin: SupabaseClient,
  ctx: UserContext,
): Promise<DigestPayload | null> {
  const nowUtc = new Date();
  const todayIso = isoDate(nowUtc);

  const [{ data: habits }, { data: logs }, { data: vac }] = await Promise.all([
    admin.from("habits").select("*").eq("user_id", ctx.userId).eq("status", "active"),
    admin
      .from("habit_logs")
      .select("habit_id, logged_on")
      .eq("user_id", ctx.userId)
      .gte("logged_on", isoDate(addDays(nowUtc, -89))),
    admin.from("vacation_days").select("day").eq("user_id", ctx.userId),
  ]);

  const all = (habits ?? []) as Habit[];
  const logsByHabit = groupLogs(logs ?? []);
  const vacSet = new Set((vac ?? []).map((v) => v.day as string));

  const atRisk = all
    .filter((h) => isScheduled(h, nowUtc) && !logsByHabit.get(h.id)?.has(todayIso))
    .map((h) => ({ h, streak: currentStreak(h, logsByHabit.get(h.id) ?? new Set(), nowUtc, vacSet) }))
    .filter((x) => x.streak >= 3)
    .sort((a, b) => b.streak - a.streak);

  if (atRisk.length === 0) return null;

  const top = atRisk[0];
  const title = `${atRisk.length} streak${atRisk.length === 1 ? "" : "s"} at risk`;
  const body =
    atRisk.length === 1
      ? `${top.h.name}: ${top.streak}-day streak ends at midnight if you don't check off.`
      : `${top.h.name} (${top.streak}d) + ${atRisk.length - 1} more end at midnight.`;

  const listHtml = atRisk
    .slice(0, 8)
    .map(
      ({ h, streak }) => `<tr><td style="padding:8px 0;border-top:1px solid #f1f5f9;">
        🔥 <span style="color:#0f172a;font-weight:600;">${escapeHtml(h.name)}</span>
        <span style="color:#b45309;font-weight:700;"> · ${streak}-day streak</span>
        <span style="color:#64748b;font-size:12px;"> · ${escapeHtml(h.category)}</span>
      </td></tr>`,
    )
    .join("");

  const html = emailShell(
    title,
    `<p style="font-size:14px;color:#b45309;margin:0 0 4px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Heads up</p>
     <h1 style="margin:0 0 12px;font-size:24px;color:#0f172a;letter-spacing:-0.02em;">${escapeHtml(title)}, ${escapeHtml(ctx.displayName)}.</h1>
     <p style="font-size:14px;color:#334155;margin:0 0 18px;">A quick check-off keeps the streak alive. It takes 30 seconds.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${listHtml}</table>
     <div style="margin-top:24px;">
       <a href="${baseUrl()}/dashboard" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Open habit-tracker →</a>
     </div>`,
  );

  return {
    title,
    body,
    pushTag: `evening-${todayIso}`,
    pushUrl: "/dashboard",
    emailSubject: `⚠️ ${title} tonight`,
    emailHtml: html,
  };
}

export async function buildWeeklyReview(
  admin: SupabaseClient,
  ctx: UserContext,
): Promise<DigestPayload> {
  const nowUtc = new Date();
  const start = addDays(nowUtc, -6);

  const [{ data: habits }, { data: logs }, { data: vac }] = await Promise.all([
    admin.from("habits").select("*").eq("user_id", ctx.userId).eq("status", "active"),
    admin
      .from("habit_logs")
      .select("habit_id, logged_on")
      .eq("user_id", ctx.userId)
      .gte("logged_on", isoDate(start))
      .lte("logged_on", isoDate(nowUtc)),
    admin
      .from("vacation_days")
      .select("day")
      .eq("user_id", ctx.userId)
      .gte("day", isoDate(start)),
  ]);

  const all = (habits ?? []) as Habit[];
  const logsByHabit = groupLogs(logs ?? []);
  const vacSet = new Set((vac ?? []).map((v) => v.day as string));

  let scheduled = 0;
  let completed = 0;
  for (const iso of dateRange(start, nowUtc)) {
    if (vacSet.has(iso)) continue;
    const d = new Date(iso);
    for (const h of all) {
      if (!isScheduled(h, d)) continue;
      scheduled++;
      if (logsByHabit.get(h.id)?.has(iso)) completed++;
    }
  }
  const rate = scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);

  const title = `This week: ${rate}% completion`;
  const body = `${completed} of ${scheduled} habits done. ${
    rate >= 80 ? "Strong week." : rate >= 50 ? "Solid effort." : "Reset and try again."
  }`;

  const html = emailShell(
    title,
    `<p style="font-size:14px;color:#475569;margin:0 0 4px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Weekly review</p>
     <h1 style="margin:0 0 12px;font-size:28px;color:#0f172a;letter-spacing:-0.02em;">${escapeHtml(ctx.displayName)}, here's how the week went.</h1>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;color:#ffffff;border-radius:14px;padding:16px;margin:18px 0;">
       <tr>
         <td width="33%" style="padding:12px;color:#94a3b8;font-size:11px;letter-spacing:.04em;text-transform:uppercase;font-weight:700;">Completion<br/><span style="color:#ffffff;font-size:32px;font-weight:900;">${rate}%</span></td>
         <td width="33%" style="padding:12px;color:#94a3b8;font-size:11px;letter-spacing:.04em;text-transform:uppercase;font-weight:700;">Done<br/><span style="color:#ffffff;font-size:32px;font-weight:900;">${completed}</span></td>
         <td width="33%" style="padding:12px;color:#94a3b8;font-size:11px;letter-spacing:.04em;text-transform:uppercase;font-weight:700;">Of<br/><span style="color:#ffffff;font-size:32px;font-weight:900;">${scheduled}</span></td>
       </tr>
     </table>
     <p style="font-size:14px;color:#334155;margin:0 0 18px;">${escapeHtml(body)}</p>
     <div style="margin-top:24px;">
       <a href="${baseUrl()}/review" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Full weekly review →</a>
     </div>`,
  );

  return {
    title,
    body,
    pushTag: `weekly-${isoDate(nowUtc)}`,
    pushUrl: "/review",
    emailSubject: `Weekly review · ${rate}% completion`,
    emailHtml: html,
  };
}

/* ============================================================
 * Dispatch — send to a single user across all their devices + email.
 * ============================================================ */

export async function dispatchToUser(
  admin: SupabaseClient,
  userId: string,
  email: string | null,
  payload: DigestPayload,
  opts: { push: boolean; email: boolean },
): Promise<{ pushSent: number; pushGone: number; emailSent: boolean; errors: string[] }> {
  const result = { pushSent: 0, pushGone: 0, emailSent: false, errors: [] as string[] };

  if (opts.push) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    for (const s of subs ?? []) {
      const r = await sendPushTo(
        s as { endpoint: string; p256dh: string; auth: string },
        {
          title: payload.title,
          body: payload.body,
          url: payload.pushUrl,
          tag: payload.pushTag,
        },
      );
      if (r.ok) result.pushSent++;
      else if (r.gone) {
        result.pushGone++;
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", (s as { endpoint: string }).endpoint);
      } else if (r.error) {
        result.errors.push(r.error);
      }
    }
  }

  if (opts.email && email && isEmailConfigured()) {
    const r = await sendEmail({
      to: email,
      subject: payload.emailSubject,
      html: payload.emailHtml,
    });
    if (r.ok) result.emailSent = true;
    else if (r.error) result.errors.push(r.error);
  }

  return result;
}

/* ============================================================
 * Resolve user context (display name + email)
 * ============================================================ */

export async function loadUserContext(
  admin: SupabaseClient,
  userId: string,
): Promise<UserContext> {
  const [profileRes, userRes] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);

  const email = userRes.data?.user?.email ?? null;
  const displayName =
    (profileRes.data?.display_name as string | null) ?? email?.split("@")[0] ?? "you";

  return { userId, displayName, email };
}
