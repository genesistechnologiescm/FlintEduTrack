"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { savePushSubscription } from "@/app/parent/push-actions";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "idle" | "working" | "on" | "denied" | "unsupported";

export function EnablePush() {
  const { t } = useI18n();
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
    } else if (Notification.permission === "granted") {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => sub && setState("on"))
        .catch(() => {});
    }
  }, []);

  async function enable() {
    setState("working");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setState("idle");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
      setState("on");
    } catch {
      setState("idle");
    }
  }

  if (state === "unsupported") return null;
  if (state === "on") {
    return (
      <span className="inline-flex min-h-9 items-center rounded-full bg-success/10 px-3 font-mono text-xs text-success">
        {t("pushOn")}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={state === "working"}
      className="inline-flex min-h-9 items-center rounded-full border border-flint-blue/30 px-3 font-mono text-xs text-flint-blue transition-colors hover:bg-flint-blue/5 disabled:opacity-60"
    >
      {state === "working" ? t("pushEnabling") : state === "denied" ? t("pushDenied") : t("pushEnable")}
    </button>
  );
}
