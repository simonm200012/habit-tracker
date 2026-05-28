"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function PushSubscriptionButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    (async () => {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const sub = await reg?.pushManager.getSubscription().catch(() => null);
      setSubscribed(!!sub);
      const r = await fetch("/api/push/vapid-key").then((r) => r.json()).catch(() => null);
      if (r?.key) setVapidKey(r.key);
    })();
  }, []);

  async function subscribe() {
    if (!vapidKey) {
      toast.error("Server hasn't configured push (missing VAPID keys)");
      return;
    }
    setBusy(true);
    try {
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Notification permission denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBuffer(vapidKey),
        });
      }
      const raw = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw),
      });
      setSubscribed(true);
      toast.success("Push notifications enabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't enable push");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't unsubscribe");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <span className="text-xs font-semibold text-slate-500 italic">
        Browser doesn&apos;t support web push.
      </span>
    );
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={busy}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60 ${
        subscribed
          ? "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
      }`}
    >
      {busy ? "…" : subscribed ? "Disable on this device" : "Enable on this device"}
    </button>
  );
}
