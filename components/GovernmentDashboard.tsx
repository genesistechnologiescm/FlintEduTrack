"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { AppHeader } from "./AppHeader";

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

  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const exportHref = `/government/export?from=${from}&to=${to}`;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AppHeader logout />
      <div className="mx-auto max-w-[820px] px-4 pb-16">
        <div className="mt-2">
          <div className="font-mono text-[11px] uppercase tracking-widest text-primary">{t("govBadge")}</div>
          <h1 className="font-display text-2xl font-semibold">{t("govTitle")}</h1>
          <p className="font-mono text-xs text-muted">{t("govGenerated")}: {data.generatedAt} · {t("govReadOnly")}</p>
        </div>

        <div className="et-anim mt-4 flex flex-col gap-4">
          {/* National numbers */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("natSchools"), value: String(data.totalSchools) },
              { label: t("studentsWord"), value: data.totalStudents.toLocaleString("en-US") },
              { label: t("natAttendance"), value: pct(data.nationalRate) },
            ].map((s) => (
              <div key={s.label} className="et-card p-4">
                <div className="text-[11px] uppercase tracking-widest text-muted">{s.label}</div>
                <div className="mt-1 font-display text-3xl font-bold tabular-nums">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Crisis gap hero */}
          <section className="et-hero et-pop p-6 text-white">
            <h2 className="font-display text-base font-semibold">{t("natCrisisTitle")}</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest" style={{ color: "#ff9a9a" }}>{t("natCrisisZones")}</div>
                <div className="mt-1 font-display text-4xl font-bold tabular-nums" style={{ color: "#ff6b6b" }}>{pct(data.crisisRate)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest" style={{ color: "var(--et-hero-sub)" }}>{t("natRest")}</div>
                <div className="mt-1 font-display text-4xl font-bold tabular-nums" style={{ color: "#2fe0a5" }}>{pct(data.restRate)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest" style={{ color: "var(--et-hero-sub)" }}>{t("natGap")}</div>
                <div className="mt-1 font-display text-4xl font-bold tabular-nums text-white">{gap === null ? "—" : `${gap}pt`}</div>
              </div>
            </div>
          </section>

          {/* Export — custom range, k-anonymised server-side */}
          <section className="et-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="et-label">{t("govFrom")}</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="et-input" />
              </label>
              <label className="text-sm">
                <span className="et-label">{t("govTo")}</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="et-input" />
              </label>
            </div>
            <a href={exportHref} className="et-btn mt-3 w-full py-3 text-sm">
              <Download size={16} aria-hidden="true" /> {t("govDownload")}
            </a>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">{t("govKNote")}</p>
          </section>

          {/* Regional breakdown */}
          <section>
            <h2 className="mb-2 text-xs font-semibold text-muted">{t("govByRegion")}</h2>
            <div className="overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-chip text-left text-[11px] uppercase tracking-widest text-muted">
                    <th className="px-4 py-2 font-medium">{t("govRegion")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("studentsWord")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("natAttendance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.regions.map((r) => (
                    <tr key={r.region} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5">
                        {r.region}
                        {r.crisis && (
                          <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase" style={{ background: "var(--et-danger-bg)", color: "var(--et-danger)" }}>
                            {t("govCrisis")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted">{r.students.toLocaleString("en-US")}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{pct(r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
