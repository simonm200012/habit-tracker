import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Body: { endpoint, keys: { p256dh, auth } }
 * Stores or refreshes the push subscription for the authenticated user.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: ua.slice(0, 200),
    },
    { onConflict: "endpoint" },
  );

  return NextResponse.json({ ok: true });
}
