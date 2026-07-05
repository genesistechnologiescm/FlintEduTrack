"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { RiskMap, type MapRow } from "./RiskMap";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";

type Region = { region: string; crisis: boolean; students: number; rate: number | null; atRisk: number };
type TrendPoint = { date: string; national: number | null; crisis: number | null; rest: number | null };

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

// Hand-rolled SVG line chart (no library): three series, theme-aware strokes.
function TrendChart({ points, label }: { points: TrendPoint[]; label: string }) {
  const W = 560, H = 150, PAD = { l: 30, r: 8, t: 10, b: 18 };
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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      {grid.map((g) => (
        <g key={g}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} style={{ stroke: "var(--et-line)" }} strokeWidth="1" />
          <text x={PAD.l - 6} y={y(g) + 3} textAnchor="end" fontSize="9" style={{ fill: "var(--et-muted)" }} fontFamily="monospace">{g}</text>
        </g>
      ))}
      <path d={path((p) => p.rest)} fill="none" style={{ stroke: "var(--et-ok)" }} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={path((p) => p.crisis)} fill="none" style={{ stroke: "var(--et-danger)" }} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={path((p) => p.national)} fill="none" style={{ stroke: "var(--et-primary)" }} strokeWidth="2.5" strokeLinejoin="round" />
      <text x={PAD.l} y={H - 4} fontSize="9" style={{ fill: "var(--et-muted)" }} fontFamily="monospace">{points[0].date.slice(5)}</text>
      <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize="9" style={{ fill: "var(--et-muted)" }} fontFamily="monospace">{points[points.length - 1].date.slice(5)}</text>
    </svg>
  );
}

export function NationalDashboard({ data }: { data: NationalData }) {
  const { t, locale, setLocale } = useI18n();
  const gap = data.crisisRate !== null && data.restRate !== null ? data.restRate - data.crisisRate : null;

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[900px] px-5 pb-16">
        {/* Top bar */}
        <div className="flex items-center gap-2 py-5">
          <span className="text-ink"><OriginMark size={20} /></span>
          <span className="font-mono text-xs uppercase tracking-widest text-primary">Flint Intelligence</span>
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

        <h1 className="font-display text-2xl font-semibold">{t("natTitle")}</h1>
        <p className="text-[13px] text-muted">{t("natSubtitle")}</p>

        <div className="et-anim mt-4 flex flex-col gap-4">
          {/* Crisis-zone gap hero — the funder hook */}
          <section className="et-hero et-pop p-6 text-white">
            <h2 className="font-display text-base font-semibold">{t("natCrisisTitle")}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,107,107,.12)" }}>
                <div className="font-display text-4xl font-bold tabular-nums" style={{ color: "#ff6b6b" }}>{pct(data.crisisRate)}</div>
                <div className="mt-1 text-[11.5px]" style={{ color: "var(--et-hero-sub)" }}>{t("natCrisisZones")}</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "rgba(47,224,165,.12)" }}>
                <div className="font-display text-4xl font-bold tabular-nums" style={{ color: "#2fe0a5" }}>{pct(data.restRate)}</div>
                <div className="mt-1 text-[11.5px]" style={{ color: "var(--et-hero-sub)" }}>{t("natRest")}</div>
              </div>
            </div>
            {gap !== null && gap > 0 && (
              <p className="mt-3 text-center text-sm font-medium" style={{ color: "var(--et-cyan)" }}>▼ {gap} {t("natGap")}</p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[11.5px]" style={{ color: "var(--et-hero-sub)" }}>
              <span><b className="text-white">{data.totalSchools}</b> {t("natSchools")}</span>
              <span><b className="text-white">{data.totalStudents}</b> {t("natStudents")}</span>
              <span><b className="text-white">{data.nationalRate === null ? "—" : `${data.nationalRate}%`}</b> {t("natAttendance")}</span>
            </div>
          </section>

          {/* At-risk intelligence */}
          <section className="et-card p-5" style={{ background: "var(--et-warn-bg)", borderColor: "transparent" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold">{t("natRiskTitle")}</h2>
                <p className="mt-1 max-w-md text-sm text-sub">{t("natRiskSub")}</p>
                {data.atRiskTotal > 0 && (
                  <p className="mt-2 text-sm font-medium text-danger">{data.crisisAtRisk} {t("natRiskInCrisis")}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-4xl font-bold tabular-nums" style={{ color: "var(--et-warn)" }}>{data.atRiskTotal}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted">{t("natRiskWord")}</div>
              </div>
            </div>
          </section>

          {/* Risk map */}
          <section className="et-card p-4">
            <h2 className="mb-3 text-xs font-semibold text-muted">{t("natMapTitle")}</h2>
            <RiskMap rows={data.mapRows} />
          </section>

          {/* 30-day trend */}
          {data.trend.length >= 2 && (
            <section className="et-card p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-muted">{t("natTrendTitle")}</h2>
                <div className="flex flex-wrap gap-3 text-[10px]">
                  <span className="inline-flex items-center gap-1 text-primary"><span className="inline-block h-0.5 w-4 bg-primary" /> {t("natNational")}</span>
                  <span className="inline-flex items-center gap-1 text-danger"><span className="inline-block h-0.5 w-4 bg-danger" /> {t("natCrisisZones")}</span>
                  <span className="inline-flex items-center gap-1 text-ok"><span className="inline-block h-0.5 w-4 bg-ok" /> {t("natRest")}</span>
                </div>
              </div>
              <TrendChart points={data.trend} label={`${t("natTrendTitle")} ${data.trend[0].date} – ${data.trend[data.trend.length - 1].date}`} />
            </section>
          )}

          {/* By region */}
          <section className="et-card p-4">
            <h2 className="mb-3 text-xs font-semibold text-muted">{t("natByRegion")}</h2>
            <ul className="space-y-3">
              {data.regions.map((r) => (
                <li key={r.region}>
                  <a href={`/national/${encodeURIComponent(r.region)}`} className="group block">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium group-hover:text-primary">
                        {r.region}
                        {r.crisis && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase" style={{ background: "var(--et-danger-bg)", color: "var(--et-danger)" }}>crisis</span>}
                      </span>
                      <span className="font-mono tabular-nums text-muted">
                        {pct(r.rate)} · {r.students}
                        {r.atRisk > 0 && <span className="text-danger"> · {r.atRisk} {t("natAtRiskShort")}</span>}
                        <span className="ml-2 text-primary">→</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-chip">
                      <div className="h-full rounded-full" style={{ width: `${r.rate ?? 0}%`, background: r.crisis ? "var(--et-danger)" : "var(--et-primary)" }} />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <p className="border-t border-line pt-5 text-sm leading-relaxed text-muted">{t("natFoot")}</p>
        </div>
      </div>
    </main>
  );
}
