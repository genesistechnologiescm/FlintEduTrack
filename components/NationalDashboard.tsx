"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { RiskMap, type MapRow } from "./RiskMap";
import { LanguageToggle } from "./LanguageToggle";

type Region = { region: string; crisis: boolean; students: number; rate: number | null; atRisk: number };

type TrendPoint = { date: string; national: number | null; crisis: number | null; rest: number | null };

// Minimal hand-rolled SVG line chart (no library): three series over ~30 days.
function TrendChart({ points }: { points: TrendPoint[] }) {
  const W = 560;
  const H = 150;
  const PAD = { l: 30, r: 8, t: 10, b: 18 };
  const values = points.flatMap((p) => [p.national, p.crisis, p.rest]).filter((v): v is number => v !== null);
  if (points.length < 2 || values.length === 0) return null;
  const yMin = Math.max(0, Math.min(...values) - 10);
  const yMax = 100;
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (points.length - 1);
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);

  const path = (pick: (p: TrendPoint) => number | null) =>
    points
      .map((p, i) => ({ v: pick(p), i }))
      .filter((d): d is { v: number; i: number } => d.v !== null)
      .map((d, j) => `${j === 0 ? "M" : "L"}${x(d.i).toFixed(1)},${y(d.v).toFixed(1)}`)
      .join(" ");

  const grid = [yMin, Math.round((yMin + 100) / 2), 100];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Attendance trend, ${points[0].date} to ${points[points.length - 1].date}`}>
      {grid.map((g) => (
        <g key={g}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
          <text x={PAD.l - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill="#8A94A6" fontFamily="monospace">
            {g}
          </text>
        </g>
      ))}
      <path d={path((p) => p.rest)} fill="none" stroke="#00C48C" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={path((p) => p.crisis)} fill="none" stroke="#FF4444" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={path((p) => p.national)} fill="none" stroke="#1A6BFF" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) =>
        p.national !== null ? <circle key={i} cx={x(i)} cy={y(p.national)} r="2.5" fill="#1A6BFF" /> : null,
      )}
      <text x={PAD.l} y={H - 4} fontSize="9" fill="#8A94A6" fontFamily="monospace">
        {points[0].date.slice(5)}
      </text>
      <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize="9" fill="#8A94A6" fontFamily="monospace">
        {points[points.length - 1].date.slice(5)}
      </text>
    </svg>
  );
}

export type NationalData = {
  totalSchools: number;
  totalStudents: number;
  nationalRate: number | null;
  crisisRate: number | null;
  restRate: number | null;
  atRiskTotal: number;
  crisisAtRisk: number;
  restAtRisk: number;
  regions: Region[];
  trend: TrendPoint[];
  mapRows: MapRow[];
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

      {/* Dropout-risk intelligence — early warning, aggregated */}
      <section className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-flint-black">{t("natRiskTitle")}</h2>
            <p className="mt-1 max-w-md text-sm text-muted">{t("natRiskSub")}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-4xl font-bold tabular-nums text-amber-700">{data.atRiskTotal}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{t("natRiskWord")}</div>
          </div>
        </div>
        {data.atRiskTotal > 0 && (
          <p className="mt-3 font-mono text-sm text-error">
            {data.crisisAtRisk} {t("natRiskInCrisis")}
          </p>
        )}
      </section>

      {/* Risk map — schematic region tiles */}
      <section className="mt-8 rounded-2xl border border-black/10 bg-white p-4">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">{t("natMapTitle")}</h2>
        <RiskMap rows={data.mapRows} />
      </section>

      {/* 30-day trend */}
      {data.trend.length >= 2 && (
        <section className="mt-8 rounded-2xl border border-black/10 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">{t("natTrendTitle")}</h2>
            <div className="flex flex-wrap gap-2 font-mono text-[10px]">
              <span className="inline-flex items-center gap-1 text-flint-blue">
                <span className="inline-block h-0.5 w-4 bg-flint-blue" /> {t("natNational")}
              </span>
              <span className="inline-flex items-center gap-1 text-error">
                <span className="inline-block h-0.5 w-4 bg-error" /> {t("natCrisisZones")}
              </span>
              <span className="inline-flex items-center gap-1 text-success">
                <span className="inline-block h-0.5 w-4 bg-success" /> {t("natRest")}
              </span>
            </div>
          </div>
          <TrendChart points={data.trend} />
        </section>
      )}

      {/* By region */}
      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("natByRegion")}</h2>
      <ul className="space-y-3">
        {data.regions.map((r) => (
          <li key={r.region}>
            <a href={`/national/${encodeURIComponent(r.region)}`} className="group block">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-flint-black group-hover:text-flint-blue">
                  {r.region}
                  {r.crisis && <span className="ml-2 rounded-full bg-error/10 px-2 py-0.5 font-mono text-[10px] uppercase text-error">crisis</span>}
                </span>
                <span className="font-mono tabular-nums text-muted">
                  {pct(r.rate)} · {r.students}
                  {r.atRisk > 0 && <span className="text-error"> · {r.atRisk} {t("natAtRiskShort")}</span>}
                  <span className="ml-2 text-flint-blue">→</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className={`h-full rounded-full ${r.crisis ? "bg-error" : "bg-flint-blue"}`}
                  style={{ width: `${r.rate ?? 0}%` }}
                />
              </div>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-8 border-t border-black/10 pt-5 text-sm leading-relaxed text-muted">
        {t("natFoot")}
      </p>
    </main>
  );
}
