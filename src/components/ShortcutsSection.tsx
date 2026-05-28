"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createShortcutToken, deleteShortcutToken } from "@/app/actions";

type TokenRow = { id: string; token: string; label: string; created_at: string; last_used_at: string | null };

export function ShortcutsSection({
  baseUrl,
  initialTokens,
}: {
  baseUrl: string;
  initialTokens: TokenRow[];
}) {
  const [tokens, setTokens] = useState(initialTokens);
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  function url(token: string, action: string, params: string = "") {
    return `${baseUrl}/api/shortcut/${token}?action=${action}${params}`;
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed"),
    );
  }

  function generate() {
    const cleanLabel = label.trim() || "iPhone";
    startTransition(async () => {
      try {
        const row = await createShortcutToken(cleanLabel);
        setTokens([{ ...row, created_at: new Date().toISOString(), last_used_at: null }, ...tokens]);
        setLabel("");
        toast.success("Token generated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't generate");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this token? Any shortcuts using it will stop working.")) return;
    startTransition(async () => {
      try {
        await deleteShortcutToken(id);
        setTokens(tokens.filter((t) => t.id !== id));
        toast.success("Token deleted");
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  return (
    <div>
      {tokens.length === 0 && (
        <p className="text-xs text-slate-500 mb-3 italic">
          No tokens yet. Generate one to use iOS Shortcuts or Siri.
        </p>
      )}

      <div className="space-y-3">
        {tokens.map((t) => (
          <div key={t.id} className="p-3 rounded-xl bg-slate-50/60 ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-bold text-slate-900 text-sm">{t.label}</p>
                <p className="text-[10px] text-slate-500">
                  {t.last_used_at
                    ? `Last used ${new Date(t.last_used_at).toLocaleString()}`
                    : "Never used"}
                </p>
              </div>
              <button
                onClick={() => remove(t.id)}
                className="text-[11px] font-bold uppercase tracking-wider text-rose-700 hover:text-rose-900 transition"
              >
                Delete
              </button>
            </div>

            <details className="text-xs">
              <summary className="font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-700">
                Endpoint URLs
              </summary>
              <div className="mt-2 space-y-2">
                <UrlRow label="Today's progress" url={url(t.token, "today")} onCopy={copy} />
                <UrlRow
                  label="Check off a habit (replace NAME)"
                  url={url(t.token, "check", "&habit=NAME")}
                  onCopy={copy}
                />
                <UrlRow
                  label="Log a value (replace NAME and 25)"
                  url={url(t.token, "log", "&habit=NAME&value=25")}
                  onCopy={copy}
                />
                <UrlRow
                  label="Skip today (vacation mode)"
                  url={url(t.token, "skip-day")}
                  onCopy={copy}
                />
              </div>
            </details>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. iPhone, Watch)"
          maxLength={60}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
        />
        <button
          onClick={generate}
          disabled={pending}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
        >
          {pending ? "…" : "Generate token"}
        </button>
      </div>

      <details className="mt-4 p-3 rounded-xl bg-amber-50 ring-1 ring-amber-200">
        <summary className="text-xs font-bold uppercase tracking-wider text-amber-800 cursor-pointer">
          How to set up iOS Shortcuts / Siri
        </summary>
        <ol className="mt-3 space-y-2 text-xs text-amber-900 list-decimal list-inside leading-relaxed">
          <li>Generate a token above (one per device is fine)</li>
          <li>Open the <strong>Shortcuts</strong> app on iPhone → tap <strong>+</strong></li>
          <li>Add the <strong>Get Contents of URL</strong> action</li>
          <li>Paste a copied endpoint URL above (e.g. "check &habit=Meditate")</li>
          <li>Set Method to <strong>GET</strong></li>
          <li>Rename the shortcut to e.g. "Log Meditate". Now say <strong>"Hey Siri, log meditate"</strong>.</li>
          <li>Optional: Add to Home Screen for one-tap check-off</li>
        </ol>
      </details>
    </div>
  );
}

function UrlRow({ label, url, onCopy }: { label: string; url: string; onCopy: (s: string) => void }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        <code className="flex-1 p-2 rounded-md bg-slate-900 text-white font-mono text-[10px] break-all">
          {url}
        </code>
        <button
          onClick={() => onCopy(url)}
          className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white rounded-md ring-1 ring-slate-200 hover:bg-slate-50 transition"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
