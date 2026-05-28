"use client";

import { useState } from "react";
import { toast } from "sonner";

export function DataPrivacySection() {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (confirmText !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    if (
      !confirm(
        "This permanently deletes your account, every habit, every log, every journal entry. This cannot be undone. Continue?",
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error || "Couldn't delete");
        return;
      }
      toast.success("Account deleted. Goodbye.");
      setTimeout(() => (window.location.href = "/login"), 800);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-bold text-slate-900 text-sm mb-1">Export your data</p>
        <p className="text-xs text-slate-500 mb-3">
          Downloads everything we hold for your account as a single JSON file. Portable, archivable, GDPR-compliant.
        </p>
        <a
          href="/api/data/export"
          download
          className="inline-block px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          Download JSON export
        </a>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <p className="font-bold text-rose-900 text-sm mb-1">Delete account</p>
        <p className="text-xs text-slate-500 mb-3">
          Permanently wipes your habits, logs, journal, achievements, and identity from this app. There is no undo.
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to enable"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 font-mono text-sm placeholder:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
          />
          <button
            onClick={deleteAccount}
            disabled={deleting || confirmText !== "DELETE"}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting…" : "Delete forever"}
          </button>
        </div>
      </div>
    </div>
  );
}
