import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AccountNameForm } from "@/components/AccountNameForm";
import { NotificationPrefsForm } from "@/components/NotificationPrefsForm";
import { PushSubscriptionButton } from "@/components/PushSubscriptionButton";
import { IntegrationsSection } from "@/components/IntegrationsSection";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, prefsRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

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
          <p className="text-xs text-slate-500 mt-0.5">Choose what's sent when.</p>
        </div>
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
          }}
          emailConfigured={emailConfigured}
          pushConfigured={pushConfigured}
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

      {/* Email */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-1">Email</h2>
        <p className="text-sm text-slate-700 font-medium tabular-nums">{user.email}</p>
        <p className="text-xs text-slate-500 mt-1">Email changes aren&apos;t supported here yet — manage in Supabase.</p>
      </section>
    </main>
  );
}
