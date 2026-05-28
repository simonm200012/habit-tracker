import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Configure the endpoint in Stripe dashboard pointing at
 * /api/stripe/webhook and add the signing secret to STRIPE_WEBHOOK_SECRET.
 *
 * We only listen for subscription lifecycle events — everything else is OK.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Stripe not configured", { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!sig) return new NextResponse("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return new NextResponse(`invalid signature: ${e instanceof Error ? e.message : e}`, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.metadata?.user_id ?? "") as string;
        const subscriptionId = session.subscription as string | null;
        const customerId = session.customer as string | null;
        if (!userId || !subscriptionId) break;

        // Fetch the actual subscription for accurate status + period_end
        const sub = await stripe().subscriptions.retrieve(subscriptionId);
        await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: sub.id,
            status: sub.status,
            price_id: sub.items.data[0]?.price.id ?? null,
            current_period_end: periodEnd(sub),
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata?.user_id ?? "") as string;
        // Best effort: if metadata user_id missing, look up by customer
        let effectiveUserId = userId;
        if (!effectiveUserId) {
          const { data } = await admin
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", sub.customer as string)
            .maybeSingle();
          effectiveUserId = (data?.user_id as string) ?? "";
        }
        if (!effectiveUserId) break;

        await admin.from("subscriptions").upsert(
          {
            user_id: effectiveUserId,
            stripe_customer_id: sub.customer as string,
            stripe_subscription_id: sub.id,
            status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
            price_id: sub.items.data[0]?.price.id ?? null,
            current_period_end: periodEnd(sub),
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    return new NextResponse(`webhook handler failed: ${e instanceof Error ? e.message : e}`, { status: 500 });
  }
}

function periodEnd(sub: Stripe.Subscription): string | null {
  // Stripe's Subscription has current_period_end as a Unix timestamp on the
  // top-level (legacy) or under items[0]. Try both.
  const candidate =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    sub.items?.data?.[0]?.current_period_end;
  return typeof candidate === "number" ? new Date(candidate * 1000).toISOString() : null;
}
