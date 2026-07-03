"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";

type SchoolRow = {
  name: string;
  division: string;
  town: string;
  crisis: boolean;
  students: number;
  rate: number | null;
  atRisk: number;
  index: number;
  breakdown: { attendance: number | null; coverage: number | null; fees: number | null; riskFree: number | null };
};

function IndexChip({ index }: { index: number }) {
  const tone = index >= 80 ? "bg-success/15 text-success" : index >= 60 ? "bg-amber-500/15 text-amber-700" : "bg-error/10 text-error";
  return <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${tone}`}>{index}</span>;
}
export type RegionData = {
  region: string;
  crisis: boolean;
  students: number;
  schools: number;
  rate: number | null;
  atRisk: number;
  rows: SchoolRow[];
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "error" }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${tone === "error" ? "text-error" : "text-flint-black"}`}>
        {value}
      </div>
    </div>
  );
}

export function NationalRegion({ data }: { data: RegionData }) {
  const { t } = useI18n();
  const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

  // Group schools by division for the geographic hierarchy.
  const divisions = new Map<string, SchoolRow[]>();
  for (const s of data.rows) {
    const list = divisions.get(s.division) ?? [];
    list.push(s);
    divisions.set(s.division, list);
  }

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/national" className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {t("natTitle")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">
            {data.region}
            {data.crisis && (
              <span className="ml-2 align-middle rounded-full bg-error/10 px-2 py-0.5 font-mono text-[10px] uppercase text-error">
                crisis
              </span>
            )}
          </h1>
        </div>
        <LanguageToggle />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("natSchools")} value={String(data.schools)} />
        <Stat label={t("natStudents")} value={String(data.students)} />
        <Stat label={t("natAttendance")} value={pct(data.rate)} />
        <Stat label={t("natAtRiskShort")} value={String(data.atRisk)} tone={data.atRisk > 0 ? "error" : undefined} />
      </div>

      <p className="mt-4 rounded-lg bg-black/[0.03] px-3 py-2 font-mono text-[10px] leading-relaxed text-muted">
        {t("perfNote")}
      </p>

      {[...divisions.entries()].map(([division, rows]) => (
        <section key={division} className="mt-7">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
            {t("natDivision")} · {division}
          </h2>
          <ul className="space-y-3">
            {rows.map((s) => (
              <li key={s.name} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <IndexChip index={s.index} />
                    <span className="truncate font-medium text-flint-black">{s.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{s.town}</span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-muted">
                    {pct(s.rate)} · {s.students}
                    {s.atRisk > 0 && <span className="text-error"> · {s.atRisk} {t("natAtRiskShort")}</span>}
                  </span>
                </div>
                <div className="mb-1 font-mono text-[10px] text-muted">
                  {[
                    s.breakdown.attendance !== null ? `${t("perfAtt")} ${s.breakdown.attendance}` : null,
                    s.breakdown.coverage !== null ? `${t("perfCov")} ${s.breakdown.coverage}` : null,
                    s.breakdown.fees !== null ? `${t("perfFees")} ${s.breakdown.fees}` : null,
                    s.breakdown.riskFree !== null ? `${t("perfRisk")} ${s.breakdown.riskFree}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                  <div
                    className={`h-full rounded-full ${s.crisis ? "bg-error" : "bg-flint-blue"}`}
                    style={{ width: `${s.rate ?? 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-8 border-t border-black/10 pt-5 text-sm leading-relaxed text-muted">{t("natFoot")}</p>
    </main>
  );
}
