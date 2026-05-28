import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/cron";
import { stripe, isStripeConfigured, STRIPE_PRO_PRICE_ID } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Creates a Stripe Checkout session and redirects the user to it. */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, error: "Stripe not configured on server" }, { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  // Ensure a Stripe customer exists for this user
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("subscriptions").upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        status: "free",
      },
      { onConflict: "user_id" },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${baseUrl}/settings?upgraded=1`,
    cancel_url: `${baseUrl}/pricing?canceled=1`,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  });

  if (!session.url) {
    return NextResponse.json({ ok: false, error: "Stripe didn't return a checkout URL" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, url: session.url });
}
