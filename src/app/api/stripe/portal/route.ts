import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Opens the Stripe Customer Portal so the user can manage their subscription. */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json({ ok: false, error: "No Stripe customer yet — start by subscribing." }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/settings`,
  });
  return NextResponse.json({ ok: true, url: session.url });
}
