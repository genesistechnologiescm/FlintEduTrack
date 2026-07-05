"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { addEvent, deleteEvent } from "@/app/admin/calendar/actions";

type Evt = { id: string; title: string; startDate: string; endDate: string | null; note: string | null; past: boolean };
export type CalendarData = { schoolName: string; events: Evt[] };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

export function CalendarManager({ data }: { data: CalendarData }) {
  const { t } = useI18n();
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
    const res = await addEvent({ title, startDate, endDate: endDate || undefined, note: note || undefined });
    setBusy(false);
    if (res.ok) {
      setTitle("");
      setStartDate("");
      setEndDate("");
      setNote("");
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  async function onDelete(id: string) {
    await deleteEvent(id);
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
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("calendarNav")}</h1>
          <p className="text-muted">{data.schoolName}</p>
        </div>
        <LanguageToggle />
      </header>

      <p className="mb-4 text-sm text-muted">{t("calIntro")}</p>

      <section className="rounded-2xl border border-line bg-surface p-5">
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
          <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
            {busy ? t("adding") : t("calAdd")}
          </button>
          {err && <p className="text-center text-sm text-error">{err}</p>}
        </form>
      </section>

      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">
        {t("upcomingEvents")} · {upcoming.length}
      </h2>
      {upcoming.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-5 text-center text-muted">{t("calNoEvents")}</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((e) => (
            <li key={e.id} className="rounded-2xl border border-line bg-surface p-4">
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
                className="mt-2 font-mono text-[11px] uppercase tracking-widest text-error hover:underline"
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
    </main>
  );
}
