"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { simulateUssd, simulateMissedCall } from "@/app/ussd-demo/actions";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

export function UssdSimulator({ defaultPhone }: { defaultPhone: string }) {
  const { t } = useI18n();
  const [phone, setPhone] = useState(defaultPhone);
  const [screen, setScreen] = useState<string | null>(null);
  const [path, setPath] = useState<string>(""); // accumulated "text" (e.g. "1")
  const [busy, setBusy] = useState(false);
  const [beep, setBeep] = useState<string | null>(null);

  async function dial(text: string) {
    setBusy(true);
    setBeep(null);
    try {
      const res = await simulateUssd({ phone, text });
      if (res.ok && res.reply) {
        setScreen(res.reply);
        setPath(text);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onMissedCall() {
    setBusy(true);
    setScreen(null);
    try {
      const res = await simulateMissedCall(phone);
      setBeep(res.ok ? `${t("ussdBeepSent")} (${res.channel}):\n${res.sent}` : res.error ?? "error");
    } finally {
      setBusy(false);
    }
  }

  const isMenu = screen?.startsWith("CON ");
  const body = screen?.replace(/^(CON|END) /, "");

  return (
    <main className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("ussdTitle")}</h1>
          <p className="text-sm text-muted">{t("ussdIntro")}</p>
        </div>
        <LanguageToggle />
      </header>

      <label className="block text-sm">
        <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("phoneLabel")}</span>
        <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      </label>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => dial("")}
          disabled={busy}
          className="min-h-11 flex-1 rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? t("adding") : t("ussdDial")}
        </button>
        <button
          type="button"
          onClick={onMissedCall}
          disabled={busy}
          className="min-h-11 flex-1 rounded-full border border-flint-blue/30 font-mono text-sm text-primary disabled:opacity-60"
        >
          {t("ussdBeep")}
        </button>
      </div>

      {/* Feature-phone screen */}
      {(screen || beep) && (
        <div className="mx-auto mt-6 max-w-[300px] rounded-[2rem] border-4 border-flint-black/80 bg-flint-black p-4">
          <div className="rounded-xl bg-[#c8d8c0] p-4 font-mono text-[13px] leading-relaxed text-ink">
            <div className="mb-2 text-[10px] uppercase tracking-widest opacity-60">
              {beep ? t("ussdSmsHeader") : "*123#"}
            </div>
            <p className="whitespace-pre-wrap">{beep ?? body}</p>
            {isMenu && (
              <div className="mt-3 flex gap-2">
                {["1", "2", "3"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={busy}
                    onClick={() => dial(path ? `${path}*${n}` : n)}
                    className="min-h-10 flex-1 rounded-lg border border-flint-black/30 bg-surface/60 font-mono text-sm font-bold disabled:opacity-60"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="mt-6 rounded-lg bg-chip px-3 py-2 font-mono text-[10px] leading-relaxed text-muted">
        {t("ussdActivationNote")}
      </p>
    </main>
  );
}
