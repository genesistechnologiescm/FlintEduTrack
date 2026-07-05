"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { ThemeToggle } from "./ThemeToggle";
import { sendToChariot } from "@/app/student/actions";

type Turn = { role: "user" | "assistant"; text: string };

export function ChariotChat({ firstName, configured }: { firstName: string; configured: boolean }) {
  const { t, locale, setLocale } = useI18n();
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
    <div className="flex h-dvh flex-col bg-bg text-ink">
      <header className="flex items-center gap-3 px-4 pb-2 pt-4">
        <a href="/student" aria-label={t("backStudent")} className="grid size-9 place-items-center rounded-full text-muted hover:bg-line">
          <ArrowLeft size={18} aria-hidden="true" />
        </a>
        <span className="grid size-9 place-items-center rounded-xl" style={{ background: "var(--et-blue-bg)" }}>
          <Sparkles size={18} className="text-primary" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <div className="font-display text-base font-semibold">{t("chariotName")}</div>
          <div className="text-[11.5px] text-muted">{t("chariotTagline")}</div>
        </div>
        <ThemeToggle />
        <div className="flex overflow-hidden rounded-full border border-line text-xs">
          {(["en", "fr"] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLocale(l)} aria-pressed={locale === l}
              className={`px-2.5 py-1.5 ${locale === l ? "bg-primary text-white" : "text-muted"}`}>{l.toUpperCase()}</button>
          ))}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col overflow-hidden px-4">
        {!configured && (
          <div className="mb-3 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--et-warn-bg)", color: "var(--et-warn)" }}>
            {t("chariotNotConfigured")}
          </div>
        )}

        <div className="et-card flex-1 space-y-3 overflow-y-auto p-4">
          {turns.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full" style={{ background: "var(--et-blue-bg)" }}>
                  <Sparkles size={22} className="text-primary" aria-hidden="true" />
                </div>
                <p className="font-medium">{t("chariotHello").replace("{name}", firstName)}</p>
                <p className="mt-1 text-sm text-muted">{t("chariotEmpty")}</p>
              </div>
            </div>
          ) : (
            turns.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm"
                  style={m.role === "user" ? { background: "var(--et-primary)", color: "#fff" } : { background: "var(--et-chip)" }}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-chip px-3 py-2 font-mono text-xs text-muted">{t("chariotThinking")}</div>
            </div>
          )}
          {err && <p className="text-center text-sm text-danger">{err}</p>}
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
            className="et-input flex-1 resize-none"
          />
          <button type="submit" disabled={busy || !input.trim()} className="et-btn shrink-0 px-4 py-3" aria-label={t("chariotSend")}>
            <Send size={18} aria-hidden="true" />
          </button>
        </form>
        <p className="mb-3 mt-2 text-center font-mono text-[10px] text-muted">{t("chariotDisclaimer")}</p>
      </div>
    </div>
  );
}
