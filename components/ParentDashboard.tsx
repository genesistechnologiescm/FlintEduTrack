"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { LogoutButton } from "./LogoutButton";

type Child = {
  name: string;
  school: string;
  className: string;
  rate: number | null;
  recent: { date: string; absent: boolean }[];
};

export type ParentData = {
  children: Child[];
  alerts: { type: string; date: string }[];
};

export function ParentDashboard({ data }: { data: ParentData }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-flint-black">{t("parentTitle")}</h1>
        <div className="flex flex-col items-end gap-2">
          <LanguageToggle />
          <LogoutButton />
        </div>
      </header>

      <div className="space-y-4">
        {data.children.map((c, i) => (
          <section key={i} className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-flint-black">{c.name}</h2>
                <p className="font-mono text-xs text-muted">
                  {c.school} · {c.className}
                </p>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl font-bold tabular-nums text-flint-black">
                  {c.rate === null ? "—" : `${c.rate}%`}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {t("parentTermRate")}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-muted">
                {t("parentRecent")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.recent.map((d, j) => (
                  <span
                    key={j}
                    title={d.date}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] ${
                      d.absent ? "bg-error/10 text-error" : "bg-success/10 text-success"
                    }`}
                  >
                    {d.date} {d.absent ? "A" : "P"}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Alerts feed */}
      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">
        {t("parentAlerts")}
      </h2>
      {data.alerts.length === 0 ? (
        <p className="rounded-xl border border-black/10 bg-white px-4 py-5 text-center text-muted">
          {t("parentNoAlerts")}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.alerts.map((a, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl border border-error/15 bg-error/5 px-4 py-3"
            >
              <span className="flex items-center gap-2 text-sm text-flint-black">
                <span className="inline-block size-2 rounded-full bg-error" />
                {t("parentAbsenceAlert")}
              </span>
              <span className="font-mono text-xs text-muted">{a.date}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
