"use client";

import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";

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

export type RegionData = {
  region: string;
  crisis: boolean;
  students: number;
  schools: number;
  rate: number | null;
  atRisk: number;
  rows: SchoolRow[];
};

function IndexChip({ index }: { index: number }) {
  const s =
    index >= 80
      ? { bg: "var(--et-ok-bg)", c: "var(--et-ok)" }
      : index >= 60
        ? { bg: "var(--et-warn-bg)", c: "var(--et-warn)" }
        : { bg: "var(--et-danger-bg)", c: "var(--et-danger)" };
  return (
    <span className="rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums" style={{ background: s.bg, color: s.c }}>
      {index}
    </span>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="et-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums" style={danger ? { color: "var(--et-danger)" } : undefined}>
        {value}
      </div>
    </div>
  );
}

export function NationalRegion({ data }: { data: RegionData }) {
  const { t, locale, setLocale } = useI18n();
  const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

  const divisions = new Map<string, SchoolRow[]>();
  for (const s of data.rows) {
    const list = divisions.get(s.division) ?? [];
    list.push(s);
    divisions.set(s.division, list);
  }

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[720px] px-4 pb-16">
        {/* Top bar */}
        <div className="flex items-center gap-2 py-5">
          <a href="/" className="flex items-center gap-2">
            <span className="text-ink"><OriginMark size={20} /></span>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">Flint Intelligence</span>
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

        <a href="/national" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <ArrowLeft size={14} aria-hidden="true" /> {t("natTitle")}
        </a>
        <h1 className="mt-1 font-display text-2xl font-semibold">
          {data.region}
          {data.crisis && (
            <span className="ml-2 align-middle rounded-full px-2 py-0.5 text-[10px] uppercase" style={{ background: "var(--et-danger-bg)", color: "var(--et-danger)" }}>
              crisis
            </span>
          )}
        </h1>

        <div className="et-anim mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t("natSchools")} value={String(data.schools)} />
            <Stat label={t("natStudents")} value={String(data.students)} />
            <Stat label={t("natAttendance")} value={pct(data.rate)} />
            <Stat label={t("natAtRiskShort")} value={String(data.atRisk)} danger={data.atRisk > 0} />
          </div>

          <p className="rounded-lg bg-chip px-3 py-2 font-mono text-[10px] leading-relaxed text-muted">{t("perfNote")}</p>

          {[...divisions.entries()].map(([division, rows]) => (
            <section key={division}>
              <h2 className="mb-3 text-xs font-semibold text-muted">{t("natDivision")} · {division}</h2>
              <ul className="space-y-3">
                {rows.map((s) => (
                  <li key={s.name} className="et-card p-4">
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <IndexChip index={s.index} />
                        <span className="truncate font-medium">{s.name}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted">{s.town}</span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-muted">
                        {pct(s.rate)} · {s.students}
                        {s.atRisk > 0 && <span className="text-danger"> · {s.atRisk} {t("natAtRiskShort")}</span>}
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
                    <div className="h-2 w-full overflow-hidden rounded-full bg-chip">
                      <div className="h-full rounded-full" style={{ width: `${s.rate ?? 0}%`, background: s.crisis ? "var(--et-danger)" : "var(--et-primary)" }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="border-t border-line pt-5 text-sm leading-relaxed text-muted">{t("natFoot")}</p>
        </div>
      </div>
    </main>
  );
}
