"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { addHandover, deleteHandover } from "@/app/handover/actions";

type Note = { id: string; className: string; body: string; until: string; author: string; mine: boolean };
export type HandoverData = {
  schoolName: string;
  isAdmin: boolean;
  myUserId: string;
  classes: { id: string; name: string }[];
  notes: Note[];
};

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

export function HandoverBoard({ data }: { data: HandoverData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [classGroupId, setClassGroupId] = useState(data.classes[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await addHandover({ classGroupId, body, activeUntil: until });
    setBusy(false);
    if (res.ok) {
      setBody("");
      setUntil("");
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  async function onDelete(id: string) {
    await deleteHandover(id);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a
            href={data.isAdmin ? "/admin" : "/attendance"}
            className="font-mono text-xs uppercase tracking-widest text-primary hover:underline"
          >
            ← {data.isAdmin ? t("backDash") : t("backAttendance")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("handoverNav")}</h1>
          <p className="text-sm text-muted">{t("hoIntro")}</p>
        </div>
        <LanguageToggle />
      </header>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("hoLeave")}</h2>
        <form onSubmit={onAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select className={field} value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} aria-label={t("fldClass")}>
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label className="text-sm">
              <span className="sr-only">{t("hoUntil")}</span>
              <input className={field} type="date" value={until} onChange={(e) => setUntil(e.target.value)} required aria-label={t("hoUntil")} />
            </label>
          </div>
          <textarea
            className="min-h-28 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base"
            placeholder={t("hoPlaceholder")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            required
          />
          <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
            {busy ? t("adding") : t("hoLeave")}
          </button>
          {err && <p className="text-center text-sm text-error">{err}</p>}
        </form>
      </section>

      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">
        {t("hoActive")} · {data.notes.length}
      </h2>
      {data.notes.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-muted">{t("hoNone")}</p>
      ) : (
        <ul className="space-y-2">
          {data.notes.map((n) => (
            <li key={n.id} className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="font-mono text-[11px] uppercase tracking-widest text-warn">
                  {n.className} · {t("hoUntilShort")} {n.until}
                </div>
                {(n.mine || data.isAdmin) && (
                  <button type="button" onClick={() => onDelete(n.id)} className="shrink-0 font-mono text-[11px] uppercase text-error hover:underline">
                    {t("resDelete")}
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{n.body}</p>
              <p className="mt-1.5 font-mono text-[11px] text-muted">{t("hoFrom")} {n.author}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
