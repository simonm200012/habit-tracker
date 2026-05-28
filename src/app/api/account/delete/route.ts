import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * GDPR account deletion. Hard-deletes the auth.users row, which cascades
 * to every table with on-delete-cascade FKs. Service-role required.
 *
 * Body must include { confirm: "DELETE" } to avoid accidental wipes.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== "DELETE") {
    return NextResponse.json(
      { ok: false, error: "Missing confirm: 'DELETE' in body" },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Sign out the caller (best effort; the user record is now gone)
    await supabase.auth.signOut().catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
