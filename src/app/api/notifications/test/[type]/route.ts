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

    const result = await dispatchToUser(admin, user.id, ctx.email, payload, {
      push: true,
      email: true,
    });

    return NextResponse.json({
      ok: true,
      type,
      pushSent: result.pushSent,
      pushGone: result.pushGone,
      emailSent: result.emailSent,
      errors: result.errors.slice(0, 3),
      // Helpful diagnostics
      hint:
        result.pushSent === 0 && !result.emailSent
          ? "Nothing was sent. Subscribe a device for push, or configure Resend (RESEND_API_KEY + RESEND_FROM) for email."
          : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
