import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AccountNameForm } from "@/components/AccountNameForm";
import { NotificationPrefsForm } from "@/components/NotificationPrefsForm";
import { PushSubscriptionButton } from "@/components/PushSubscriptionButton";
import { IntegrationsSection } from "@/components/IntegrationsSection";
import { SetupChecklist } from "@/components/SetupChecklist";
import { ShortcutsSection } from "@/components/ShortcutsSection";
import { ManageSubscriptionButton } from "@/components/CheckoutButton";
import { DataPrivacySection } from "@/components/DataPrivacySection";
import { getSubscription } from "@/lib/billing";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, prefsRes, tokensRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("shortcut_tokens")
      .select("id, token, label, created_at, last_used_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const shortcutTokens = tokensRes.data as Array<{
    id: string;
    token: string;
    label: string;
    created_at: string;
    last_used_at: string | null;
  }> | null;

  const currentName: string =
    (profileRes.data?.display_name as string | null) ??
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";

  // Ensure a prefs row exists so we have tokens to show
  let prefs = prefsRes.data;
  if (!prefs) {
    const ins = await supabase
      .from("notification_prefs")
      .insert({ user_id: user.id })
      .select("*")
      .single();
    prefs = ins.data;
  }

  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
  const pushConfigured = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
  const cronConfigured = Boolean(process.env.CRON_SECRET);
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { count: pushSubCount } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const subscription = await getSubscription(user.id);
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);

  // Build base URL
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3030";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-3xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-600 text-sm mt-1">Account, notifications, integrations.</p>
      </div>

      {/* Account */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Account name</h2>
            <p className="text-xs text-slate-500 mt-0.5">How you appear in greetings, the sidebar, and to partners.</p>
          </div>
        </div>
        <AccountNameForm currentName={currentName} />
      </section>

      {/* Billing */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Plan & billing</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              You&apos;re on the{" "}
              <span className={`font-bold ${subscription.plan === "pro" ? "text-emerald-700" : "text-slate-700"}`}>
                {subscription.plan === "pro" ? "Pro" : "Free"}
              </span>{" "}
              plan.
              {subscription.plan === "pro" && subscription.currentPeriodEnd && (
                <>
                  {" "}
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${subscription.currentPeriodEnd.toLocaleDateString()}.`
                    : `Renews ${subscription.currentPeriodEnd.toLocaleDateString()}.`}
                </>
              )}
            </p>
          </div>
          {subscription.plan === "pro" ? (
            <ManageSubscriptionButton />
          ) : stripeConfigured ? (
            <Link
              href="/pricing"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              Upgrade to Pro →
            </Link>
          ) : (
            <span className="text-[10px] italic text-slate-500">Stripe not configured</span>
          )}
        </div>
      </section>

      {/* Push subscription */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Push notifications</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {pushConfigured
                ? "Allow this browser to receive reminders even when the app is closed."
                : "VAPID keys aren't configured on the server yet. Until then, push uses the local notifications fallback while the tab is open."}
            </p>
          </div>
          <PushSubscriptionButton />
        </div>
      </section>

      {/* Notification preferences */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Notification preferences</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose what's sent when. Click <strong>Test send</strong> next to any row to fire it now.
          </p>
        </div>
        <SetupChecklist
          pushConfigured={pushConfigured}
          emailConfigured={emailConfigured}
          cronConfigured={cronConfigured}
          serviceRoleConfigured={serviceRoleConfigured}
          pushSubscriptionCount={pushSubCount ?? 0}
          hasEmailAddress={Boolean(user.email)}
        />
        <NotificationPrefsForm
          prefs={{
            morning_brief_email: prefs?.morning_brief_email ?? false,
            morning_brief_push: prefs?.morning_brief_push ?? true,
            evening_alert_email: prefs?.evening_alert_email ?? false,
            evening_alert_push: prefs?.evening_alert_push ?? true,
            weekly_review_email: prefs?.weekly_review_email ?? true,
            weekly_review_push: prefs?.weekly_review_push ?? false,
            morning_brief_hour: prefs?.morning_brief_hour ?? 7,
            evening_alert_hour: prefs?.evening_alert_hour ?? 20,
            timezone: prefs?.timezone ?? "UTC",
            digest_email: (prefs?.digest_email as string | null) ?? null,
          }}
          emailConfigured={emailConfigured}
          pushConfigured={pushConfigured}
          authEmail={user.email ?? null}
        />
      </section>

      {/* Integrations */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Integrations</h2>
          <p className="text-xs text-slate-500 mt-0.5">Connect Apple Calendar and Apple Health.</p>
        </div>
        <IntegrationsSection
          baseUrl={baseUrl}
          initialIcalToken={(prefs?.ical_token as string) ?? ""}
          initialHealthToken={(prefs?.health_token as string) ?? ""}
        />
      </section>

      {/* iOS Shortcuts / Siri */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">iOS Shortcuts / Siri</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            One-tap check-off from your home screen or Apple Watch. Token-protected, scoped to your account.
          </p>
        </div>
        <ShortcutsSection baseUrl={baseUrl} initialTokens={shortcutTokens ?? []} />
      </section>

      {/* Data & privacy */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Data &amp; privacy</h2>
          <p className="text-xs text-slate-500 mt-0.5">Your data, your choice.</p>
        </div>
        <DataPrivacySection />
      </section>

      {/* Email */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-1">Email</h2>
        <p className="text-sm text-slate-700 font-medium tabular-nums">{user.email}</p>
        <p className="text-xs text-slate-500 mt-1">Email changes aren&apos;t supported here yet — manage in Supabase.</p>
      </section>
    </main>
  );
}
