"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";

export type MapRow = { region: string; atRisk: number; students: number; hasData: boolean };

// Schematic tile map of Cameroon's 10 regions (grid-map style — deliberately
// NOT hand-drawn boundaries, which would risk inaccuracy). Tiles are arranged
// to approximate geography; colour = dropout-risk intensity; grey = no
// EduTrack schools in that region yet.
const LAYOUT: { region: string; code: string; col: number; row: number }[] = [
  { region: "Far North", code: "FN", col: 2, row: 0 },
  { region: "North", code: "NO", col: 2, row: 1 },
  { region: "Adamawa", code: "AD", col: 2, row: 2 },
  { region: "North West", code: "NW", col: 0, row: 3 },
  { region: "West", code: "WE", col: 1, row: 3 },
  { region: "Centre", code: "CE", col: 2, row: 3 },
  { region: "East", code: "ES", col: 3, row: 3 },
  { region: "South West", code: "SW", col: 0, row: 4 },
  { region: "Littoral", code: "LT", col: 1, row: 4 },
  { region: "South", code: "SO", col: 2, row: 4 },
];

function tone(row: MapRow | undefined): { fill: string; text: string } {
  if (!row || !row.hasData) return { fill: "rgba(0,0,0,0.05)", text: "#8A94A6" };
  if (row.atRisk >= 3) return { fill: "rgba(255,68,68,0.18)", text: "#B91C1C" };
  if (row.atRisk >= 1) return { fill: "rgba(245,158,11,0.20)", text: "#92400E" };
  return { fill: "rgba(0,196,140,0.16)", text: "#047857" };
}

export function RiskMap({ rows }: { rows: MapRow[] }) {
  const { t } = useI18n();
  const byRegion = new Map(rows.map((r) => [r.region, r]));
  const SIZE = 74;
  const GAP = 6;
  const W = 4 * SIZE + 3 * GAP;
  const H = 5 * SIZE + 4 * GAP;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[340px]" role="img" aria-label={t("natMapTitle")}>
        {LAYOUT.map((tile) => {
          const row = byRegion.get(tile.region);
          const { fill, text } = tone(row);
          const x = tile.col * (SIZE + GAP);
          const y = tile.row * (SIZE + GAP);
          const body = (
            <g key={tile.region}>
              <rect x={x} y={y} width={SIZE} height={SIZE} rx={10} fill={fill} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
              <text x={x + SIZE / 2} y={y + 26} textAnchor="middle" fontSize="13" fontWeight="700" fill={text} fontFamily="monospace">
                {tile.code}
              </text>
              <text x={x + SIZE / 2} y={y + 44} textAnchor="middle" fontSize="11" fill={text} fontFamily="monospace">
                {row?.hasData ? `${row.atRisk} ${t("natAtRiskShort")}` : "—"}
              </text>
              {row?.hasData && (
                <text x={x + SIZE / 2} y={y + 59} textAnchor="middle" fontSize="9" fill="#8A94A6" fontFamily="monospace">
                  {row.students} {t("studentsWord")}
                </text>
              )}
            </g>
          );
          return row?.hasData ? (
            <a key={tile.region} href={`/national/${encodeURIComponent(tile.region)}`} aria-label={`${tile.region}: ${row.atRisk} ${t("natAtRiskShort")}`}>
              {body}
            </a>
          ) : (
            body
          );
        })}
      </svg>
      <p className="mt-2 text-center font-mono text-[10px] text-muted">{t("natMapNote")}</p>
    </div>
  );
}
