"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";

type Row = {
  studentId: string;
  name: string;
  className: string;
  score: number;
  band: "high" | "watch" | "low";
  reasons: string[];
};
export type RiskData = {
  schoolName: string;
  total: number;
  counts: { high: number; watch: number; low: number };
  flagged: Row[];
};

const BAND: Record<"high" | "watch" | "low", { bg: string; text: string; label: string }> = {
  high: { bg: "bg-error/10", text: "text-error", label: "highRisk" },
  watch: { bg: "bg-amber-500/10", text: "text-amber-700", label: "watchRisk" },
  low: { bg: "bg-success/10", text: "text-success", label: "lowRisk" },
};

function Stat({ label, value, tone }: { label: string; value: number; tone: "high" | "watch" | "low" }) {
  const c = BAND[tone];
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold tabular-nums ${c.text}`}>{value}</div>
    </div>
  );
}

export function RiskRadar({ data }: { data: RiskData }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("riskNav")}</h1>
          <p className="text-muted">
            {data.schoolName} · {data.total} {t("studentsWord")}
          </p>
        </div>
        <LanguageToggle />
      </header>

      <p className="mb-4 text-sm text-muted">{t("riskIntro")}</p>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t("highRisk")} value={data.counts.high} tone="high" />
        <Stat label={t("watchRisk")} value={data.counts.watch} tone="watch" />
        <Stat label={t("lowRisk")} value={data.counts.low} tone="low" />
      </div>

      <h2 className="mb-3 mt-7 font-mono text-xs uppercase tracking-widest text-muted">{t("riskFlagged")}</h2>

      {data.flagged.length === 0 ? (
        <p className="rounded-2xl border border-success/20 bg-success/5 px-4 py-6 text-center text-success">
          {t("riskNoneFlagged")}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.flagged.map((r) => {
            const c = BAND[r.band];
            return (
              <li key={r.studentId} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-flint-black">{r.name}</div>
                    <div className="font-mono text-xs text-muted">{r.className}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display text-xl font-bold tabular-nums text-flint-black">{r.score}</span>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${c.bg} ${c.text}`}>
                      {t(c.label as "highRisk")}
                    </span>
                  </div>
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {r.reasons.map((reason, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-muted">
                      <span className={`inline-block size-1.5 rounded-full ${r.band === "high" ? "bg-error" : "bg-amber-500"}`} />
                      {reason}
                    </li>
                  ))}
                </ul>
                <a
                  href="/admin/welfare"
                  className="mt-3 inline-flex min-h-9 items-center font-mono text-[11px] uppercase tracking-widest text-flint-blue hover:underline"
                >
                  {t("riskReview")} →
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
