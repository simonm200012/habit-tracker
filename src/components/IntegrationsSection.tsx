"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { regenerateToken } from "@/app/actions";

export function IntegrationsSection({
  baseUrl,
  initialIcalToken,
  initialHealthToken,
}: {
  baseUrl: string;
  initialIcalToken: string;
  initialHealthToken: string;
}) {
  const [icalToken, setIcalToken] = useState(initialIcalToken);
  const [healthToken, setHealthToken] = useState(initialHealthToken);
  const [pending, startTransition] = useTransition();

  const icalUrl = `${baseUrl}/api/ical/${icalToken}`;
  const healthUrl = `${baseUrl}/api/integrations/health-auto-export/${healthToken}`;

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied"),
      () => toast.error("Copy failed"),
    );
  }

  function regen(kind: "ical" | "health") {
    if (!confirm("Regenerating will break any existing subscriptions / integrations using the old URL. Continue?")) return;
    startTransition(async () => {
      try {
        const newToken = await regenerateToken(kind);
        if (kind === "ical") setIcalToken(newToken);
        else setHealthToken(newToken);
        toast.success("New token generated");
      } catch {
        toast.error("Couldn't regenerate");
      }
    });
  }

  return (
    <div className="space-y-5">
      <Card
        title="Calendar feed (iCal)"
        description="Subscribe in Apple Calendar, Google Calendar, or any iCal-aware app to see your habits as recurring events."
        emoji="🗓️"
        url={icalUrl}
        instructions={[
          "Apple Calendar: File → New Calendar Subscription → paste URL",
          "Google Calendar: Other calendars + → From URL → paste",
        ]}
        onCopy={() => copy(icalUrl)}
        onRegen={() => regen("ical")}
        pending={pending}
      />
      <Card
        title="Apple Health auto-sync"
        description="Install the iOS app 'Health Auto Export' and add an automation that POSTs to this URL. Steps / sleep / active energy / workouts auto-fill matching habits."
        emoji="❤️"
        url={healthUrl}
        instructions={[
          "Open Health Auto Export on iPhone → Automations → New Automation",
          "Pick metrics: step_count, sleep_analysis, active_energy, apple_exercise_time",
          "Output: REST API → paste URL · Frequency: hourly",
        ]}
        onCopy={() => copy(healthUrl)}
        onRegen={() => regen("health")}
        pending={pending}
      />
    </div>
  );
}

function Card({
  title,
  description,
  emoji,
  url,
  instructions,
  onCopy,
  onRegen,
  pending,
}: {
  title: string;
  description: string;
  emoji: string;
  url: string;
  instructions: string[];
  onCopy: () => void;
  onRegen: () => void;
  pending: boolean;
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-50/60 ring-1 ring-slate-200">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl ring-1 ring-slate-200 shrink-0">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm tracking-tight">{title}</p>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-900 text-white font-mono text-[11px] break-all mb-2 flex items-center gap-2">
        <span className="flex-1 select-all">{url}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={onCopy}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 transition"
        >
          Copy URL
        </button>
        <button
          onClick={onRegen}
          disabled={pending}
          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white rounded-lg ring-1 ring-rose-200 hover:bg-rose-50 transition disabled:opacity-60"
        >
          {pending ? "…" : "Regenerate"}
        </button>
      </div>

      <details>
        <summary className="text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700 transition">
          Setup instructions
        </summary>
        <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
          {instructions.map((s, i) => (
            <li key={i} className="flex gap-2"><span className="text-slate-400">{i + 1}.</span><span>{s}</span></li>
          ))}
        </ul>
      </details>
    </div>
  );
}
