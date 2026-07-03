"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { LogoutButton } from "./LogoutButton";

type Region = { region: string; crisis: boolean; students: number; rate: number | null };
type SchoolRow = { name: string; region: string; crisis: boolean; students: number; rate: number | null };
export type GovernmentData = {
  generatedAt: string;
  totalSchools: number;
  totalStudents: number;
  nationalRate: number | null;
  crisisRate: number | null;
  restRate: number | null;
  regions: Region[];
  schools: SchoolRow[];
};

const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

export function GovernmentDashboard({ data }: { data: GovernmentData }) {
  const { t } = useI18n();
  const gap = data.crisisRate !== null && data.restRate !== null ? data.restRate - data.crisisRate : null;

  // Server export: custom date range + k-anonymity applied server-side.
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const exportHref = `/government/export?from=${from}&to=${to}`;

  return (
    <main className="mx-auto max-w-[760px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-flint-blue">{t("govBadge")}</div>
          <h1 className="font-display text-2xl font-bold text-flint-black">{t("govTitle")}</h1>
          <p className="font-mono text-xs text-muted">{t("govGenerated")}: {data.generatedAt} · {t("govReadOnly")}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LanguageToggle />
          <LogoutButton />
        </div>
      </header>

      {/* National numbers */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{t("natSchools")}</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-flint-black">{data.totalSchools}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{t("studentsWord")}</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-flint-black">{data.totalStudents.toLocaleString("en-US")}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{t("natAttendance")}</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-flint-black">{pct(data.nationalRate)}</div>
        </div>
      </div>

      {/* Crisis gap — the funder hook */}
      <section className="mt-4 rounded-2xl border border-error/20 bg-error/5 p-5">
        <h2 className="font-display text-lg font-bold text-flint-black">{t("natCrisisTitle")}</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-error">{t("natCrisisZones")}</div>
            <div className="mt-1 font-display text-4xl font-bold tabular-nums text-error">{pct(data.crisisRate)}</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{t("natRest")}</div>
            <div className="mt-1 font-display text-4xl font-bold tabular-nums text-flint-black">{pct(data.restRate)}</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{t("natGap")}</div>
            <div className="mt-1 font-display text-4xl font-bold tabular-nums text-flint-black">{gap === null ? "—" : `${gap}pt`}</div>
          </div>
        </div>
      </section>

      {/* Export — custom range, k-anonymised server-side */}
      <section className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("govFrom")}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("govTo")}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base"
            />
          </label>
        </div>
        <a
          href={exportHref}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full bg-flint-blue font-mono text-sm font-medium text-white"
        >
          {t("govDownload")}
        </a>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">{t("govKNote")}</p>
      </section>

      {/* Regional breakdown */}
      <h2 className="mb-2 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("govByRegion")}</h2>
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left font-mono text-[11px] uppercase tracking-widest text-muted">
              <th className="px-4 py-2">{t("govRegion")}</th>
              <th className="px-4 py-2 text-right">{t("studentsWord")}</th>
              <th className="px-4 py-2 text-right">{t("natAttendance")}</th>
            </tr>
          </thead>
          <tbody>
            {data.regions.map((r) => (
              <tr key={r.region} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-2 text-flint-black">
                  {r.region}
                  {r.crisis && <span className="ml-2 rounded-full bg-error/10 px-2 py-0.5 font-mono text-[10px] uppercase text-error">{t("govCrisis")}</span>}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">{r.students.toLocaleString("en-US")}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-flint-black">{pct(r.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
