"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";

type Region = { region: string; crisis: boolean; students: number; rate: number | null };

export type NationalData = {
  totalSchools: number;
  totalStudents: number;
  nationalRate: number | null;
  crisisRate: number | null;
  restRate: number | null;
  regions: Region[];
};

function pct(n: number | null) {
  return n === null ? "—" : `${n}%`;
}

export function NationalDashboard({ data }: { data: NationalData }) {
  const { t } = useI18n();
  const gap =
    data.crisisRate !== null && data.restRate !== null ? data.restRate - data.crisisRate : null;

  return (
    <main className="mx-auto max-w-[820px] px-5 pb-16 pt-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-flint-blue">
            <span className="size-2 rounded-full bg-flint-cyan" />
            Flint Intelligence
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold text-flint-black">{t("natTitle")}</h1>
          <p className="text-muted">{t("natSubtitle")}</p>
        </div>
        <LanguageToggle />
      </header>

      {/* Headline numbers */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("natSchools"), value: String(data.totalSchools) },
          { label: t("natStudents"), value: String(data.totalStudents) },
          { label: t("natAttendance"), value: pct(data.nationalRate) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{s.label}</div>
            <div className="mt-2 font-display text-3xl font-bold tabular-nums text-flint-black">{s.value}</div>
          </div>
        ))}
      </div>

      {/* The crisis-zone gap — the funder hook */}
      <section className="mt-5 rounded-2xl border border-error/20 bg-error/5 p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-flint-black">{t("natCrisisTitle")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-error">{t("natCrisisZones")}</div>
            <div className="mt-1 font-display text-4xl font-bold tabular-nums text-error">{pct(data.crisisRate)}</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{t("natRest")}</div>
            <div className="mt-1 font-display text-4xl font-bold tabular-nums text-flint-black">{pct(data.restRate)}</div>
          </div>
        </div>
        {gap !== null && gap > 0 && (
          <p className="mt-3 font-mono text-sm text-error">
            ▼ {gap} {t("natGap")}
          </p>
        )}
      </section>

      {/* By region */}
      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("natByRegion")}</h2>
      <ul className="space-y-3">
        {data.regions.map((r) => (
          <li key={r.region}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-flint-black">
                {r.region}
                {r.crisis && <span className="ml-2 rounded-full bg-error/10 px-2 py-0.5 font-mono text-[10px] uppercase text-error">crisis</span>}
              </span>
              <span className="font-mono tabular-nums text-muted">
                {pct(r.rate)} · {r.students}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
              <div
                className={`h-full rounded-full ${r.crisis ? "bg-error" : "bg-flint-blue"}`}
                style={{ width: `${r.rate ?? 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 border-t border-black/10 pt-5 text-sm leading-relaxed text-muted">
        {t("natFoot")}
      </p>
    </main>
  );
}
