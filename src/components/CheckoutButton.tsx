"use client";

import { useState } from "react";
import { toast } from "sonner";

export function CheckoutButton() {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (!data.ok || !data.url) {
        toast.error(data.error || "Couldn't start checkout");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className="block w-full px-5 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-sm transition shadow-lg disabled:opacity-60"
    >
      {busy ? "Opening checkout…" : "Upgrade to Pro →"}
    </button>
  );
}

export function ManageSubscriptionButton() {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!data.ok || !data.url) {
        toast.error(data.error || "Couldn't open portal");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60"
    >
      {busy ? "…" : "Manage subscription"}
    </button>
  );
}
