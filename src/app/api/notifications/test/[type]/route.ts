import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/cron";
import {
  buildEveningAlert,
  buildMorningBrief,
  buildWeeklyReview,
  dispatchToUser,
  loadUserContext,
} from "@/lib/notifications";

/**
 * Authenticated test send. Fires the requested digest to ONLY the current
 * user (push + email if configured). Used by the "Send test now" buttons
 * in /settings. Sends push regardless of pref (this is a test); sends email
 * only if Resend is configured AND user has email.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const { type } = await params;
  if (type !== "morning" && type !== "evening" && type !== "weekly") {
    return NextResponse.json({ ok: false, error: "invalid type" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const ctx = await loadUserContext(admin, user.id);

    let payload =
      type === "morning"
        ? await buildMorningBrief(admin, ctx)
        : type === "evening"
        ? await buildEveningAlert(admin, ctx)
        : await buildWeeklyReview(admin, ctx);

    if (!payload) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason:
          "No streaks of ≥3 days at risk right now — the evening alert would not fire. Build up a streak and try again.",
      });
    }

    // Mark as [TEST] in the subject + push title so the user knows it's a test
    payload = {
      ...payload,
      title: `[Test] ${payload.title}`,
      emailSubject: `[Test] ${payload.emailSubject}`,
    };

    // Diagnostics: how many subscriptions does this user have?
    const { count: subCount } = await admin
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const result = await dispatchToUser(admin, user.id, ctx.email, payload, {
      push: true,
      email: true,
    });

    // Build a precise hint based on what actually happened.
    const hints: string[] = [];
    if (result.pushSent === 0 && (subCount ?? 0) === 0) {
      hints.push("No push subscriptions on file. Click 'Enable on this device' first.");
    }
    if (result.pushSent === 0 && (subCount ?? 0) > 0 && result.pushGone > 0) {
      hints.push(
        `${result.pushGone} stale subscription(s) removed. Re-enable on this device to subscribe with current VAPID keys.`,
      );
    }
    if (!result.emailSent) {
      const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
      if (!hasResend) hints.push("Resend env vars not configured.");
      else if (!ctx.email) hints.push("No email address on file.");
    }

    return NextResponse.json({
      ok: true,
      type,
      pushSent: result.pushSent,
      pushGone: result.pushGone,
      subscriptionsOnFile: subCount ?? 0,
      emailSent: result.emailSent,
      errors: result.errors.slice(0, 5),
      hint: hints.join(" "),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
