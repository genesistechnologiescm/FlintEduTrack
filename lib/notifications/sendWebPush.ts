import webpush from "web-push";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@edutrack.local", pub, priv);
  configured = true;
  return true;
}

// Free push (no per-message cost). Best-effort: a dead/expired subscription
// must never break the calling flow.
export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!configure()) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("web push failed:", (e as Error).message);
  }
}
