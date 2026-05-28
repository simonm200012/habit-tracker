import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Let Stripe SDK pick its default API version — avoids breakage when SDK upgrades.
      typescript: true,
    });
  }
  return client;
}

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRICE_PRO ?? "";
