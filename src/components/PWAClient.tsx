"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt: () => Promise<void>;
};

const DISMISS_KEY = "ht_pwa_dismissed";

export function PWAClient() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {/* swallow — non-fatal */});
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const dismissed = typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;
    function handler(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Installed — find it on your home screen.");
    }
    setShow(false);
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-5 sm:max-w-sm z-40">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200/70 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
          ht
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm tracking-tight">Install habit-tracker</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Add to your home screen for one-tap access and offline mode.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg transition"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
