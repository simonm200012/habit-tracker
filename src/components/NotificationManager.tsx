"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Reminder = {
  habitId: string;
  habitName: string;
  /** "HH:MM:SS" or "HH:MM" */
  time: string;
  /** "daily" | "weekdays" | "weekly" */
  frequency: string;
  done: boolean;
};

const DISMISS_KEY = "ht_notif_dismissed";
const STORAGE_KEY = "ht_notif_last_fired";

function parseHHMM(t: string): { h: number; m: number } | null {
  const m = /^(\d{2}):(\d{2})/.exec(t);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadFired(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed.day !== todayKey()) return {};
    return parsed.fired ?? {};
  } catch {
    return {};
  }
}

function saveFired(fired: Record<string, true>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ day: todayKey(), fired }));
}

function isScheduledToday(freq: string): boolean {
  const dow = new Date().getDay();
  if (freq === "daily") return true;
  if (freq === "weekdays") return dow >= 1 && dow <= 5;
  if (freq === "weekly") return dow === 1;
  return true;
}

export function NotificationManager({ reminders }: { reminders: Reminder[] }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const [showPrompt, setShowPrompt] = useState(false);

  // Show banner only if there are reminders, permission is default, and user didn't dismiss it
  useEffect(() => {
    if (permission !== "default") return;
    if (reminders.length === 0) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    setShowPrompt(true);
  }, [permission, reminders.length]);

  // Check reminders every 30s
  useEffect(() => {
    if (permission !== "granted") return;
    if (reminders.length === 0) return;

    function check() {
      const now = new Date();
      const fired = loadFired();
      let updated = false;
      for (const r of reminders) {
        if (r.done) continue;
        if (!isScheduledToday(r.frequency)) continue;
        const t = parseHHMM(r.time);
        if (!t) continue;
        if (now.getHours() < t.h) continue;
        if (now.getHours() === t.h && now.getMinutes() < t.m) continue;
        const key = `${r.habitId}_${t.h}_${t.m}`;
        if (fired[key]) continue;
        try {
          new Notification(`Time for ${r.habitName}`, {
            body: "Check it off in habit-tracker when done.",
            tag: key,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            silent: false,
          });
        } catch {/* swallow */}
        fired[key] = true;
        updated = true;
      }
      if (updated) saveFired(fired);
    }

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [permission, reminders]);

  async function requestPerm() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    setShowPrompt(false);
    if (result === "granted") {
      toast.success("Reminders enabled");
      try {
        new Notification("Reminders enabled", {
          body: "We'll nudge you when each habit is due.",
          icon: "/icon-192.png",
        });
      } catch {}
    } else if (result === "denied") {
      toast("Reminders blocked. Enable them in browser settings if you change your mind.");
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 right-4 z-40 max-w-sm">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200/70 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-50 ring-1 ring-violet-200 flex items-center justify-center text-violet-700 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm tracking-tight">Get habit reminders</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Browser notifications at each habit's reminder time. {reminders.length} set up.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={requestPerm}
              className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
            >
              Enable
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
