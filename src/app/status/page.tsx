import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { isEmailConfigured } from "@/lib/email";
import { isPushConfigured } from "@/lib/webpush";

export const dynamic = "force-dynamic";

/**
 * Public status page — anyone can visit, no PII shown. Probes each
 * downstream service so customers / yourself can quickly diagnose
 * outages without digging through Vercel logs.
 */
export default async function StatusPage() {
  const checks = await runChecks();
  const allOk = checks.every((c) => c.status === "operational");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div
          className={`p-6 rounded-3xl text-white mb-6 shadow-lg ${
            allOk
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700"
              : "bg-gradient-to-br from-amber-600 to-rose-700"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70 mb-2">
            habit-tracker status
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {allOk ? "All systems operational." : "Some services degraded."}
          </h1>
          <p className="text-sm text-white/80 mt-2">
            Last checked {new Date().toLocaleString()}
          </p>
        </div>

        <ul className="space-y-2">
          {checks.map((c) => (
            <li
              key={c.name}
              className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200/70 p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.detail}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                  c.status === "operational"
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                    : c.status === "degraded"
                    ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                    : c.status === "not-configured"
                    ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                    : "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                }`}
              >
                {c.status === "operational"
                  ? "✓ Operational"
                  : c.status === "not-configured"
                  ? "—"
                  : c.status === "degraded"
                  ? "⚠ Degraded"
                  : "✗ Down"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

type Check = {
  name: string;
  status: "operational" | "degraded" | "down" | "not-configured";
  detail: string;
};

async function runChecks(): Promise<Check[]> {
  const checks: Check[] = [];

  // Supabase
  try {
    const supabase = await createClient();
    const t0 = performance.now();
    const { error } = await supabase.from("habits").select("id", { count: "exact", head: true });
    const ms = Math.round(performance.now() - t0);
    if (error) {
      checks.push({ name: "Database (Supabase)", status: "down", detail: error.message });
    } else {
      checks.push({
        name: "Database (Supabase)",
        status: ms < 800 ? "operational" : "degraded",
        detail: `Responded in ${ms}ms`,
      });
    }
  } catch (e) {
    checks.push({
      name: "Database (Supabase)",
      status: "down",
      detail: e instanceof Error ? e.message : "Unknown error",
    });
  }

  // Stripe
  if (!isStripeConfigured()) {
    checks.push({ name: "Billing (Stripe)", status: "not-configured", detail: "STRIPE_SECRET_KEY not set" });
  } else {
    try {
      const t0 = performance.now();
      await stripe().products.list({ limit: 1 });
      const ms = Math.round(performance.now() - t0);
      checks.push({
        name: "Billing (Stripe)",
        status: ms < 1500 ? "operational" : "degraded",
        detail: `Responded in ${ms}ms`,
      });
    } catch (e) {
      checks.push({
        name: "Billing (Stripe)",
        status: "down",
        detail: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  // Email (Resend) — no live ping; just check config
  checks.push({
    name: "Email digests (Resend)",
    status: isEmailConfigured() ? "operational" : "not-configured",
    detail: isEmailConfigured() ? "API key + sender configured" : "RESEND_API_KEY or RESEND_FROM missing",
  });

  // Push
  checks.push({
    name: "Web Push (VAPID)",
    status: isPushConfigured() ? "operational" : "not-configured",
    detail: isPushConfigured() ? "VAPID keys configured" : "VAPID_* env vars missing",
  });

  // Sentry
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  checks.push({
    name: "Error tracking (Sentry)",
    status: sentryDsn ? "operational" : "not-configured",
    detail: sentryDsn ? "DSN configured" : "Optional. Add SENTRY_DSN to enable.",
  });

  // Cron auth
  checks.push({
    name: "Cron jobs",
    status: process.env.CRON_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY ? "operational" : "not-configured",
    detail:
      process.env.CRON_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "Cron secret + service role configured"
        : "CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY missing",
  });

  return checks;
}
