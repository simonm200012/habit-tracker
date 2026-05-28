/**
 * Free vs Pro feature gating. Reads the subscriptions table (server-only).
 * Used by server actions and pages to decide what to show / allow.
 */
import { createClient } from "@/lib/supabase/server";

export type Plan = "free" | "pro";

export type SubscriptionInfo = {
  plan: Plan;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
};

const ACTIVE_STATUSES = new Set(["trialing", "active"]);

export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  const status = (data?.status as string) ?? "free";
  const cpe = data?.current_period_end ? new Date(data.current_period_end as string) : null;
  const inGoodStanding = ACTIVE_STATUSES.has(status) && (!cpe || cpe.getTime() > Date.now() - 24 * 60 * 60 * 1000);

  return {
    plan: inGoodStanding ? "pro" : "free",
    status,
    currentPeriodEnd: cpe,
    cancelAtPeriodEnd: Boolean(data?.cancel_at_period_end),
    stripeCustomerId: (data?.stripe_customer_id as string) ?? null,
  };
}

/* ============================================================
 * Free plan limits
 * ============================================================ */

export const FREE_HABIT_LIMIT = 5;

export const PRO_FEATURES = {
  unlimitedHabits: "Unlimited habits (free is capped at 5)",
  apiIntegrations: "Apple Health + iCal feed",
  shortcuts: "iOS Shortcuts / Siri",
  emailDigests: "Morning brief + weekly review by email",
  publicProfile: "Public habit profile",
  partners: "Accountability partners + group challenges",
  yearInReview: "Spotify-Wrapped-style year in review",
  advancedAnalytics: "Habit correlations + streak predictions",
} as const;
