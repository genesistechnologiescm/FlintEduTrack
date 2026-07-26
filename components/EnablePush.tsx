"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
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

export function EnablePush({ variant = "pill" }: { variant?: "pill" | "banner" }) {
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

  // Prominent, explanatory prompt for the parent dashboard. Only nags when
  // alerts are off — vanishes once they're on (the pill confirms that).
  if (variant === "banner") {
    if (state === "unsupported" || state === "on") return null;
    return (
      <div className="et-card flex items-start gap-3 border-primary/25 bg-blue-bg/60 p-4">
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <BellRing size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-semibold text-ink">{t("pushBannerTitle")}</div>
          <p className="mt-0.5 text-[13px] leading-snug text-sub">
            {state === "denied" ? t("pushBannerBlocked") : t("pushBannerBody")}
          </p>
          {state !== "denied" && (
            <button
              type="button"
              onClick={enable}
              disabled={state === "working"}
              className="et-btn mt-3 min-h-11 px-5 text-sm disabled:opacity-60"
            >
              {state === "working" ? t("pushEnabling") : t("pushBannerBtn")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state === "unsupported") return null;
  if (state === "on") {
    return (
      <span className="inline-flex min-h-8 items-center rounded-full bg-ok-bg px-2.5 font-mono text-[11px] text-ok">
        {t("pushOn")}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={state === "working"}
      className="inline-flex min-h-8 items-center rounded-full border border-primary/30 px-2.5 font-mono text-[11px] font-medium text-primary transition-colors hover:bg-blue-bg disabled:opacity-60"
    >
      {state === "working" ? t("pushEnabling") : state === "denied" ? t("pushDenied") : t("pushEnable")}
    </button>
  );
}
