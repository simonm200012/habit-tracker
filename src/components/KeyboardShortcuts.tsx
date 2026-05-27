"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const ROUTES: Record<string, { path: string; label: string }> = {
  d: { path: "/dashboard", label: "Dashboard" },
  h: { path: "/habits", label: "Habits" },
  c: { path: "/calendar", label: "Calendar" },
  a: { path: "/analytics", label: "Analytics" },
  r: { path: "/review", label: "Weekly review" },
  t: { path: "/achievements", label: "Achievements" },
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't intercept while typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((s) => !s);
        return;
      }
      if (e.key === "Escape") {
        if (showHelp) setShowHelp(false);
        if (pendingG) setPendingG(false);
        return;
      }
      if (e.key === "g") {
        e.preventDefault();
        setPendingG(true);
        setTimeout(() => setPendingG(false), 1500);
        return;
      }
      if (pendingG && ROUTES[e.key.toLowerCase()]) {
        e.preventDefault();
        const r = ROUTES[e.key.toLowerCase()];
        router.push(r.path);
        toast(`→ ${r.label}`, { duration: 1200 });
        setPendingG(false);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router, pendingG, showHelp]);

  return (
    <>
      {pendingG && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-lg">
          g … press a letter
        </div>
      )}

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200/70 p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold tracking-tight text-slate-900">Keyboard shortcuts</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">Show this help</span>
                <kbd className="px-2 py-0.5 bg-slate-100 ring-1 ring-slate-200 rounded font-mono text-xs">?</kbd>
              </li>
              <li className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pt-2">Navigation</li>
              {Object.entries(ROUTES).map(([key, r]) => (
                <li key={key} className="flex items-center justify-between py-1.5">
                  <span className="text-slate-700">{r.label}</span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 bg-slate-100 ring-1 ring-slate-200 rounded font-mono text-xs">g</kbd>
                    <span className="text-slate-400 text-xs">then</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 ring-1 ring-slate-200 rounded font-mono text-xs">{key}</kbd>
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">Close any dialog</span>
                <kbd className="px-2 py-0.5 bg-slate-100 ring-1 ring-slate-200 rounded font-mono text-xs">Esc</kbd>
              </li>
            </ul>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Pro tip: press <kbd className="px-1 bg-slate-100 ring-1 ring-slate-200 rounded font-mono">?</kbd> from anywhere to see this menu.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
