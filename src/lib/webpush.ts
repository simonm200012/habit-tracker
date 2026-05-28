import webpush from "web-push";

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

let configured = false;
function ensureConfigured() {
  if (configured || !isPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** Send a notification to a single subscription. Returns true on success. */
export async function sendPushTo(
  sub: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<{ ok: boolean; gone?: boolean; error?: string }> {
  if (!isPushConfigured()) return { ok: false, error: "VAPID not configured" };
  ensureConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
    return { ok: true };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      // Subscription expired or unsubscribed
      return { ok: false, gone: true, error: String(e) };
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
