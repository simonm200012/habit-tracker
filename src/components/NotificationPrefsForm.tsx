"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { saveNotificationPrefs } from "@/app/actions";
import { TestNotificationButton } from "@/components/TestNotificationButton";

type Prefs = {
  morning_brief_email: boolean;
  morning_brief_push: boolean;
  evening_alert_email: boolean;
  evening_alert_push: boolean;
  weekly_review_email: boolean;
  weekly_review_push: boolean;
  morning_brief_hour: number;
  evening_alert_hour: number;
  timezone: string;
  digest_email: string | null;
};

export function NotificationPrefsForm({
  prefs,
  emailConfigured,
  pushConfigured,
  authEmail,
}: {
  prefs: Prefs;
  emailConfigured: boolean;
  pushConfigured: boolean;
  authEmail: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const detectedTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          try {
            await saveNotificationPrefs(fd);
            toast.success("Preferences saved");
          } catch {
            toast.error("Couldn't save");
          }
        });
      }}
      className="space-y-5"
    >
      <Row
        label="Morning brief"
        description="Today's habits, top streaks, insights. Fires daily at 06:00 UTC."
        emailName="morning_brief_email"
        pushName="morning_brief_push"
        emailDefault={prefs.morning_brief_email}
        pushDefault={prefs.morning_brief_push}
        emailConfigured={emailConfigured}
        pushConfigured={pushConfigured}
        testType="morning"
      />
      <Row
        label="Evening at-risk alert"
        description="Heads-up when active streaks are about to break. Fires daily at 19:00 UTC."
        emailName="evening_alert_email"
        pushName="evening_alert_push"
        emailDefault={prefs.evening_alert_email}
        pushDefault={prefs.evening_alert_push}
        emailConfigured={emailConfigured}
        pushConfigured={pushConfigured}
        testType="evening"
      />
      <Row
        label="Weekly review"
        description="The week in numbers + a plan-for-next-week prompt. Fires Sundays at 17:00 UTC."
        emailName="weekly_review_email"
        pushName="weekly_review_push"
        emailDefault={prefs.weekly_review_email}
        pushDefault={prefs.weekly_review_push}
        emailConfigured={emailConfigured}
        pushConfigured={pushConfigured}
        testType="weekly"
      />

      {/* Hidden — preserved on Hobby for future Pro upgrade */}
      <input type="hidden" name="timezone" defaultValue={prefs.timezone ?? detectedTz} />
      <input type="hidden" name="morning_brief_hour" defaultValue={prefs.morning_brief_hour ?? 7} />
      <input type="hidden" name="evening_alert_hour" defaultValue={prefs.evening_alert_hour ?? 20} />

      {/* Digest delivery email override */}
      <div className="p-4 rounded-xl bg-slate-50/60 ring-1 ring-slate-200">
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
          Send digests to
        </label>
        <input
          type="email"
          name="digest_email"
          defaultValue={prefs.digest_email ?? ""}
          placeholder={authEmail ?? "you@example.com"}
          className="w-full sm:w-96 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
        />
        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
          Leave blank to use your account email ({authEmail ?? "n/a"}). Use this if you signed up
          for Resend with a different address — Resend&apos;s testing mode only delivers to your
          Resend signup email until you verify a domain.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}

function Row({
  label,
  description,
  emailName,
  pushName,
  emailDefault,
  pushDefault,
  emailConfigured,
  pushConfigured,
  testType,
}: {
  label: string;
  description: string;
  emailName: string;
  pushName: string;
  emailDefault: boolean;
  pushDefault: boolean;
  emailConfigured: boolean;
  pushConfigured: boolean;
  testType: "morning" | "evening" | "weekly";
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-50/60 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-slate-900 text-sm tracking-tight">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <TestNotificationButton type={testType} />
      </div>
      <div className="flex flex-wrap gap-2">
        <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ring-1 cursor-pointer transition ${pushConfigured ? "bg-white ring-slate-200 hover:bg-slate-50" : "bg-slate-100 ring-slate-200 opacity-60 cursor-not-allowed"}`}>
          <input type="checkbox" name={pushName} defaultChecked={pushDefault && pushConfigured} disabled={!pushConfigured} className="w-4 h-4 accent-slate-900" />
          <span className="text-xs font-semibold text-slate-700">Push</span>
          {!pushConfigured && <span className="text-[10px] text-slate-500 italic">(not configured)</span>}
        </label>
        <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ring-1 cursor-pointer transition ${emailConfigured ? "bg-white ring-slate-200 hover:bg-slate-50" : "bg-slate-100 ring-slate-200 opacity-60 cursor-not-allowed"}`}>
          <input type="checkbox" name={emailName} defaultChecked={emailDefault && emailConfigured} disabled={!emailConfigured} className="w-4 h-4 accent-slate-900" />
          <span className="text-xs font-semibold text-slate-700">Email</span>
          {!emailConfigured && <span className="text-[10px] text-slate-500 italic">(not configured)</span>}
        </label>
      </div>
    </div>
  );
}
