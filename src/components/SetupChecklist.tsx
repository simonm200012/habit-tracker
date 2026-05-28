type Check = {
  label: string;
  ok: boolean;
  hint: string;
  detail?: string;
};

export function SetupChecklist({
  pushConfigured,
  emailConfigured,
  cronConfigured,
  serviceRoleConfigured,
  pushSubscriptionCount,
  hasEmailAddress,
}: {
  pushConfigured: boolean;
  emailConfigured: boolean;
  cronConfigured: boolean;
  serviceRoleConfigured: boolean;
  pushSubscriptionCount: number;
  hasEmailAddress: boolean;
}) {
  const checks: Check[] = [
    {
      label: "Database migration 008",
      ok: true,
      hint: "Required — schema with push subscriptions + prefs.",
      detail: "Verified by the fact that this page loads.",
    },
    {
      label: "Service-role key on server",
      ok: serviceRoleConfigured,
      hint: "SUPABASE_SERVICE_ROLE_KEY env var — needed for cron + test sends.",
      detail: serviceRoleConfigured ? undefined : "Add it in Vercel → Settings → Environment Variables.",
    },
    {
      label: "Cron auth",
      ok: cronConfigured,
      hint: "CRON_SECRET env var — Vercel sets this for scheduled jobs.",
      detail: cronConfigured ? undefined : "Generate one (openssl rand -hex 32) and paste in Vercel envs.",
    },
    {
      label: "Web Push (VAPID)",
      ok: pushConfigured,
      hint: "NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT.",
      detail: pushConfigured ? undefined : "Run: npx web-push generate-vapid-keys",
    },
    {
      label: "Push subscriptions",
      ok: pushSubscriptionCount > 0,
      hint: "Number of devices that will receive push notifications.",
      detail:
        pushSubscriptionCount > 0
          ? `${pushSubscriptionCount} device${pushSubscriptionCount === 1 ? "" : "s"} subscribed.`
          : 'Click "Enable on this device" above.',
    },
    {
      label: "Email sender (Resend)",
      ok: emailConfigured,
      hint: "RESEND_API_KEY + RESEND_FROM.",
      detail: emailConfigured ? undefined : "Sign up at resend.com, verify a domain, paste env vars.",
    },
    {
      label: "Email address on file",
      ok: hasEmailAddress,
      hint: "We send to your Supabase account email.",
    },
  ];

  const okCount = checks.filter((c) => c.ok).length;

  return (
    <div className="p-4 rounded-xl bg-slate-50/60 ring-1 ring-slate-200 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-slate-900 text-sm tracking-tight">Setup status</p>
          <p className="text-xs text-slate-500 mt-0.5">What's configured server-side.</p>
        </div>
        <span className="text-xs font-bold text-slate-700 tabular-nums bg-white px-2 py-1 rounded-md ring-1 ring-slate-200">
          {okCount} / {checks.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2.5 text-xs">
            <span
              className={`mt-0.5 w-4 h-4 rounded-md ring-1 flex items-center justify-center text-[10px] font-bold shrink-0 ${
                c.ok
                  ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                  : "bg-amber-100 text-amber-700 ring-amber-200"
              }`}
            >
              {c.ok ? "✓" : "!"}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${c.ok ? "text-slate-800" : "text-slate-900"}`}>
                {c.label}
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">{c.hint}</p>
              {c.detail && (
                <p
                  className={`text-[11px] mt-0.5 leading-relaxed ${
                    c.ok ? "text-slate-500" : "text-amber-700 font-medium"
                  }`}
                >
                  {c.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
