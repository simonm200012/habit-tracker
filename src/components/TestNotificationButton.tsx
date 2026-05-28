"use client";

import { useState } from "react";
import { toast } from "sonner";

export function TestNotificationButton({
  type,
  label,
}: {
  type: "morning" | "evening" | "weekly";
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const res = await fetch(`/api/notifications/test/${type}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error || "Couldn't send test");
        return;
      }
      if (data.skipped) {
        toast.message(data.reason);
        return;
      }
      const parts: string[] = [];
      if (data.pushSent > 0) parts.push(`${data.pushSent} push`);
      if (data.emailSent) parts.push(`email`);
      const errs = Array.isArray(data.errors) ? data.errors : [];
      const gone = data.pushGone > 0 ? `${data.pushGone} stale push subscription removed.` : "";

      if (parts.length === 0) {
        // Nothing actually sent — show why.
        const lines = [
          data.hint || "Nothing was sent.",
          gone,
          ...errs.map((e: string) => `• ${e}`),
        ].filter(Boolean);
        toast.error(lines.join("\n"), { duration: 12_000 });
      } else if (errs.length > 0 || gone) {
        // Partial success
        toast.warning(
          [`Sent: ${parts.join(" + ")}`, gone, ...errs.map((e: string) => `• ${e}`)]
            .filter(Boolean)
            .join("\n"),
          { duration: 10_000 },
        );
      } else {
        toast.success(`Test sent: ${parts.join(" + ")}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={busy}
      className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-white rounded-md ring-1 ring-slate-200 hover:bg-slate-50 transition disabled:opacity-60"
      title="Send this digest to you right now"
    >
      {busy ? "…" : label ?? "Test send"}
    </button>
  );
}
