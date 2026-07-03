"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { excuseAbsence } from "@/app/admin/absences/actions";

type Row = { recordId: string; student: string; className: string; subject: string; date: string };
export type AbsencesData = {
  schoolName: string;
  absences: Row[];
  excused: { student: string; date: string; reason: string }[];
};

function AbsenceRow({ row }: { row: Row }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onExcuse(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await excuseAbsence({ recordId: row.recordId, reason });
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr(res.error ?? "error");
  }

  return (
    <li className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-flint-black">{row.student}</div>
          <div className="font-mono text-[11px] text-muted">
            {row.className} · {row.subject} · {row.date}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-h-10 shrink-0 rounded-full border border-flint-blue/30 px-4 font-mono text-xs uppercase tracking-widest text-flint-blue"
        >
          {open ? t("cancel") : t("excuseBtn")}
        </button>
      </div>

      {open && (
        <form onSubmit={onExcuse} className="mt-3 border-t border-black/5 pt-3">
          <label className="block text-sm">
            <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("excuseReason")}</span>
            <input
              className="min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("excusePlaceholder")}
              minLength={3}
              maxLength={500}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-2 min-h-11 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? t("adding") : t("excuseConfirm")}
          </button>
          {err && <p className="mt-2 text-center text-sm text-error">{err}</p>}
        </form>
      )}
    </li>
  );
}

export function AbsencesPanel({ data }: { data: AbsencesData }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("absencesNav")}</h1>
          <p className="text-sm text-muted">{t("absencesIntro")}</p>
        </div>
        <LanguageToggle />
      </header>

      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        {t("absencesRecent")} · {data.absences.length}
      </h2>
      {data.absences.length === 0 ? (
        <p className="rounded-2xl border border-success/20 bg-success/5 px-4 py-6 text-center text-success">{t("absencesNone")}</p>
      ) : (
        <ul className="space-y-2">
          {data.absences.map((row) => (
            <AbsenceRow key={row.recordId} row={row} />
          ))}
        </ul>
      )}

      {data.excused.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("excusedRecent")}</h2>
          <ul className="space-y-1">
            {data.excused.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-success/20 bg-success/5 px-4 py-2 text-sm">
                <span className="min-w-0 truncate text-flint-black">
                  {e.student} <span className="text-muted">· {e.reason}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted">{e.date}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
