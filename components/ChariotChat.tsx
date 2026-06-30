"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { sendToChariot } from "@/app/student/actions";

type Turn = { role: "user" | "assistant"; text: string };

export function ChariotChat({ firstName, configured }: { firstName: string; configured: boolean }) {
  const { t } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Turn[] = [...turns, { role: "user", text }];
    setTurns(next);
    setInput("");
    setBusy(true);
    setErr(null);
    const res = await sendToChariot({ history: next.slice(-16) });
    setBusy(false);
    if (res.ok && res.text) {
      setTurns((cur) => [...cur, { role: "assistant", text: res.text! }]);
    } else {
      setErr(res.reason === "not_configured" ? t("chariotNotConfigured") : t("chariotUnavailable"));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-4 pb-4 pt-6">
      <header className="mb-3 flex items-start justify-between gap-4">
        <div>
          <a href="/student" className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {t("backStudent")}
          </a>
          <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-flint-black">
            <span className="inline-block size-2.5 rounded-full bg-flint-cyan" aria-hidden />
            {t("chariotName")}
          </h1>
          <p className="text-sm text-muted">{t("chariotTagline")}</p>
        </div>
        <LanguageToggle />
      </header>

      {!configured && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          {t("chariotNotConfigured")}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-black/10 bg-white p-4">
        {turns.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-flint-blue/10">
                <span className="inline-block size-3 rounded-full bg-flint-cyan" aria-hidden />
              </div>
              <p className="font-medium text-flint-black">{t("chariotHello").replace("{name}", firstName)}</p>
              <p className="mt-1 text-sm text-muted">{t("chariotEmpty")}</p>
            </div>
          </div>
        ) : (
          turns.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-flint-blue text-white" : "bg-black/5 text-flint-black"}`}>
                {m.text}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-black/5 px-3 py-2 font-mono text-xs text-muted">{t("chariotThinking")}</div>
          </div>
        )}
        {err && <p className="text-center text-sm text-error">{err}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          maxLength={1500}
          placeholder={t("chariotPlaceholder")}
          className="min-h-12 flex-1 resize-none rounded-xl border border-black/15 bg-white px-3 py-3 text-base"
        />
        <button type="submit" disabled={busy || !input.trim()} className="min-h-12 shrink-0 rounded-full bg-flint-blue px-5 font-mono text-sm font-medium text-white disabled:opacity-60">
          {t("chariotSend")}
        </button>
      </form>
      <p className="mt-2 text-center font-mono text-[10px] text-muted">{t("chariotDisclaimer")}</p>
    </main>
  );
}
