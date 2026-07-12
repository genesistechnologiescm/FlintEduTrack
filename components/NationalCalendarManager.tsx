"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";
import { addNationalEvent, deleteNationalEvent } from "@/app/government/calendar/actions";

type Evt = { id: string; title: string; startDate: string; endDate: string | null; note: string | null; past: boolean };
export type NationalCalendarData = { events: Evt[] };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

// Government-only manager for the national exam calendar. Standalone page
// (the /government section has no app shell): own top bar with back link,
// theme and language controls, mirroring the ministry dashboard.
export function NationalCalendarManager({ data }: { data: NationalCalendarData }) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upcoming = data.events.filter((e) => !e.past);
  const past = data.events.filter((e) => e.past);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await addNationalEvent({ title, startDate, endDate: endDate || undefined, note: note || undefined });
      if (res.ok) {
        setTitle("");
        setStartDate("");
        setEndDate("");
        setNote("");
        router.refresh();
      } else setErr(res.error ?? "error");
    } catch {
      setErr("error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    await deleteNationalEvent(id);
    router.refresh();
  }

  function DateRange({ e }: { e: Evt }) {
    return (
      <span className="font-mono text-xs tabular-nums text-muted">
        {e.startDate}
        {e.endDate ? ` → ${e.endDate}` : ""}
      </span>
    );
  }

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[640px] px-4 pb-16">
        {/* Top bar */}
        <div className="flex items-center gap-2 py-5">
          <a href="/government" aria-label={t("govCalBack")} className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink">
            <ArrowLeft size={18} aria-hidden="true" />
          </a>
          <a href="/government" className="flex items-center gap-2">
            <span className="text-ink"><OriginMark size={20} /></span>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">{t("govBadge")}</span>
          </a>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="flex overflow-hidden rounded-full border border-line text-xs">
              {(["en", "fr"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLocale(l)} aria-pressed={locale === l}
                  className={`px-2.5 py-1.5 ${locale === l ? "bg-primary text-white" : "text-muted"}`}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">{t("govCalNav")}</h1>
        <p className="mb-4 mt-1 text-sm text-muted">{t("govCalIntro")}</p>

        <section className="et-card p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("calAdd")}</h2>
          <form onSubmit={onAdd} className="space-y-3">
            <input className={field} placeholder={t("fldTitle")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("calStart")}</span>
                <input className={field} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("calEnd")}</span>
                <input className={field} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} />
              </label>
            </div>
            <input className={field} placeholder={t("calNote")} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            <button type="submit" disabled={busy} className="et-btn min-h-11 w-full text-sm">
              {busy ? t("adding") : t("calAdd")}
            </button>
            {err && <p className="text-center text-sm text-danger">{err}</p>}
          </form>
        </section>

        <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">
          {t("upcomingEvents")} · {upcoming.length}
        </h2>
        {upcoming.length === 0 ? (
          <p className="et-card px-4 py-5 text-center text-muted">{t("calNoEvents")}</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <li key={e.id} className="et-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-ink">{e.title}</div>
                    {e.note && <div className="mt-0.5 text-sm text-muted">{e.note}</div>}
                  </div>
                  <DateRange e={e} />
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(e.id)}
                  className="mt-2 font-mono text-[11px] uppercase tracking-widest text-danger hover:underline"
                >
                  {t("resDelete")}
                </button>
              </li>
            ))}
          </ul>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("pastEvents")}</h2>
            <ul className="space-y-1">
              {past.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2 text-sm">
                  <span className="min-w-0 truncate text-muted">{e.title}</span>
                  <DateRange e={e} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
