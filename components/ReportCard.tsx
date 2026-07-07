"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import type { SubjectGrade } from "@/lib/grades";

export type ReportData = {
  studentName: string;
  school: string;
  region: string;
  className: string;
  subjects: SubjectGrade[];
  overall: number | null;
  attendanceRate: number | null;
};

export function ReportCard({ data, studentId }: { data: ReportData; studentId: string }) {
  const { t, locale } = useI18n();
  const fmt = (n: number | null) => (n === null ? "—" : n.toFixed(1));

  return (
    <main className="mx-auto max-w-[680px] px-5 py-8">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href="/parent" className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink">
          ←
        </a>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <a
            href={`/report/${studentId}/pdf?lang=${locale}`}
            className="inline-flex min-h-11 items-center rounded-full border border-flint-blue/30 px-5 font-mono text-xs font-medium uppercase tracking-widest text-primary"
          >
            {t("downloadPdf")}
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-mono text-xs font-medium uppercase tracking-widest text-white"
          >
            {t("print")}
          </button>
        </div>
      </div>

      {/* The card */}
      <article className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <header className="border-b border-line pb-4">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary">
            <span className="size-2 rounded-full bg-flint-cyan" />
            {data.school} · {data.region}
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("reportCard")}</h1>
          <p className="mt-1 text-muted">
            {data.studentName} · {data.className}
          </p>
        </header>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-widest text-muted">
              <th className="pb-2">{t("reportCard") === "Bulletin" ? "Matière" : "Subject"}</th>
              <th className="pb-2 text-right tabular-nums">{t("seq1")}</th>
              <th className="pb-2 text-right tabular-nums">{t("seq2")}</th>
              <th className="pb-2 text-right tabular-nums">{t("avgCol")}</th>
            </tr>
          </thead>
          <tbody>
            {data.subjects.map((s) => (
              <tr key={s.subject} className="border-b border-line">
                <td className="py-2 text-ink">{s.subject}</td>
                <td className="py-2 text-right font-mono tabular-nums text-muted">{fmt(s.seq1)}</td>
                <td className="py-2 text-right font-mono tabular-nums text-muted">{fmt(s.seq2)}</td>
                <td className="py-2 text-right font-mono font-bold tabular-nums text-ink">{fmt(s.avg)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-blue-bg px-4 py-3">
          <span className="font-mono text-xs uppercase tracking-widest text-muted">{t("overallAvg")}</span>
          <span className="font-display text-2xl font-bold tabular-nums text-primary">
            {data.overall === null ? "—" : `${data.overall} / 20`}
          </span>
        </div>

        {data.attendanceRate !== null && (
          <p className="mt-3 text-right font-mono text-xs text-muted">
            {t("parentTermRate")}: <span className="font-bold text-ink">{data.attendanceRate}%</span>
          </p>
        )}
      </article>
    </main>
  );
}
