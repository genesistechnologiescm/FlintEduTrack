"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { checkInAtGate } from "@/app/gate/actions";

type GateState = { time: string; onTime: boolean } | null;

export function GateBanner({ initial }: { initial: GateState }) {
  const { t } = useI18n();
  const [state, setState] = useState<GateState>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function tap() {
    setBusy(true);
    setErr(null);
    try {
      const res = await checkInAtGate();
      if (res.ok && res.time) setState({ time: res.time, onTime: !!res.onTime });
      else setErr(res.error ?? "error");
    } catch {
      setErr(t("loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (state) {
    return (
      <div
        className={`mx-auto mb-4 flex max-w-[560px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
          state.onTime ? "border-success/25 bg-success/5" : "border-amber-500/30 bg-amber-500/10"
        }`}
      >
        <span className={`font-medium ${state.onTime ? "text-success" : "text-amber-800"}`}>
          {t("gateArrived")} {state.time} · {state.onTime ? t("gateOnTime") : t("gateLate")}
        </span>
        <span className={`inline-block size-2.5 rounded-full ${state.onTime ? "bg-success" : "bg-amber-500"}`} aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto mb-4 flex max-w-[560px] items-center justify-between gap-3 rounded-2xl border border-flint-blue/20 bg-flint-blue/5 px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium text-flint-black">{t("gateTitle")}</div>
        {err && <div className="text-xs text-error">{err}</div>}
      </div>
      <button
        type="button"
        onClick={tap}
        disabled={busy}
        className="min-h-11 shrink-0 rounded-full bg-flint-blue px-5 font-mono text-xs font-medium uppercase tracking-widest text-white disabled:opacity-60"
      >
        {busy ? t("adding") : t("gateTap")}
      </button>
    </div>
  );
}
