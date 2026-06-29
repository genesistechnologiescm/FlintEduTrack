"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { LogoutButton } from "./LogoutButton";
import { EnablePush } from "./EnablePush";
import type { SubjectGrade } from "@/lib/grades";

type Child = {
  studentId: string;
  name: string;
  school: string;
  className: string;
  rate: number | null;
  recent: { date: string; absent: boolean }[];
  subjects: SubjectGrade[];
  overall: number | null;
};

export type ParentData = {
  children: Child[];
  alerts: { type: string; date: string }[];
  announcements: { title: string; body: string; date: string }[];
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

      <div className="mb-5 space-y-3">
        <EnablePush />
        <a
          href="/parent/messages"
          className="flex min-h-11 items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 transition-colors hover:bg-black/[0.02]"
        >
          <span className="font-medium text-flint-black">{t("messagesNav")}</span>
          <span className="font-mono text-xs text-flint-blue">→</span>
        </a>
      </div>

      <div className="space-y-4">
        {data.children.map((c) => (
          <section key={c.studentId} className="rounded-2xl border border-black/10 bg-white p-5">
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

            {/* Recent attendance */}
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

            {/* Grades */}
            {c.subjects.length > 0 && (
              <div className="mt-4 border-t border-black/5 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                    {t("gradesTitle")}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {t("overallAvg")}:{" "}
                    <span className="font-bold text-flint-black">
                      {c.overall === null ? "—" : `${c.overall}/20`}
                    </span>
                  </span>
                </div>
                <ul className="space-y-1">
                  {c.subjects.map((s) => (
                    <li key={s.subject} className="flex items-center justify-between text-sm">
                      <span className="text-flint-black">{s.subject}</span>
                      <span className="font-mono tabular-nums text-muted">
                        {s.avg === null ? "—" : `${s.avg}/20`}
                      </span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`/report/${c.studentId}`}
                  className="mt-3 inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline"
                >
                  {t("viewReport")} →
                </a>
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Announcements from the school */}
      {data.announcements.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">
            {t("parentAnnouncements")}
          </h2>
          <ul className="space-y-2">
            {data.announcements.map((a, i) => (
              <li key={i} className="rounded-xl border border-flint-blue/20 bg-flint-blue/5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display font-bold text-flint-black">{a.title}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{a.date}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-flint-black">{a.body}</p>
              </li>
            ))}
          </ul>
        </>
      )}

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
