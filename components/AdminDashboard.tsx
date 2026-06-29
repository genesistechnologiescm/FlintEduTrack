"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { LogoutButton } from "./LogoutButton";

type Period = {
  id: string;
  subject: string;
  className: string;
  teacher: string;
  time: string;
  submitted: boolean;
  present: number;
  absent: number;
};

export type AdminData = {
  schoolName: string;
  attendanceRate: number | null;
  periodsSubmitted: number;
  periodsScheduled: number;
  absencesToday: number;
  studentsEnrolled: number;
  periods: Period[];
  alerts: {
    sent: number;
    queued: number;
    costFcfa: number;
    recent: { phone: string; status: string }[];
  };
};

function StatCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "alert" }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="font-mono text-xs uppercase tracking-widest text-muted">{label}</div>
      <div
        className={`mt-2 font-display text-3xl font-bold tabular-nums ${
          tone === "alert" ? "text-error" : "text-flint-black"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function AdminDashboard({ data }: { data: AdminData }) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-flint-black">
            {t("adminTitle")}
          </h1>
          <p className="text-muted">
            {data.schoolName} · {data.studentsEnrolled} {t("studentsWord")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LanguageToggle />
          <LogoutButton />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
        <a
          href="/admin/setup"
          className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline"
        >
          {t("setupNav")} →
        </a>
        <a
          href="/admin/students"
          className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline"
        >
          {t("manageStudents")} →
        </a>
        <a
          href="/admin/teachers"
          className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline"
        >
          {t("manageTeachers")} →
        </a>
      </div>

      {/* Three numbers */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t("attendanceToday")}
          value={data.attendanceRate === null ? "—" : `${data.attendanceRate}%`}
        />
        <StatCard
          label={t("periodsSubmitted")}
          value={`${data.periodsSubmitted}/${data.periodsScheduled}`}
        />
        <StatCard
          label={t("absencesToday")}
          value={String(data.absencesToday)}
          tone={data.absencesToday > 0 ? "alert" : "default"}
        />
      </div>

      {/* Welfare entry point */}
      <a
        href="/admin/welfare"
        className="mt-4 flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 transition-colors hover:bg-black/[0.02]"
      >
        <span className="font-medium text-flint-black">{t("welfareCta")}</span>
        <span className="font-mono text-xs text-flint-blue">→</span>
      </a>

      {/* Parent alerts today */}
      <section className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            {t("alertsTitle")}
          </h2>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-700">
            {t("alertsMock")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <div className="font-display text-2xl font-bold tabular-nums text-flint-black">
              {data.alerts.sent}
            </div>
            <div className="font-mono text-xs text-muted">{t("alertsSent")}</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold tabular-nums text-flint-black">
              {data.alerts.queued}
            </div>
            <div className="font-mono text-xs text-muted">{t("alertsQueued")}</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold tabular-nums text-flint-black">
              {data.alerts.costFcfa}
            </div>
            <div className="font-mono text-xs text-muted">{t("alertsCost")} · FCFA</div>
          </div>
        </div>
        {data.alerts.recent.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-black/5 pt-3">
            {data.alerts.recent.map((a, i) => (
              <li key={i} className="flex items-center justify-between font-mono text-xs">
                <span className="text-muted">{a.phone}</span>
                <span className={a.status === "SENT" ? "text-success" : "text-muted"}>
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Completion grid */}
      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">
        {t("todaysPeriods")}
      </h2>

      {data.periods.length === 0 ? (
        <p className="rounded-xl border border-black/10 bg-white px-4 py-6 text-center text-muted">
          {t("noPeriods")}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.periods.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-flint-black">
                  {p.subject} · {p.className}
                </div>
                <div className="truncate font-mono text-xs text-muted">
                  {p.time} · {p.teacher}
                </div>
              </div>

              {p.submitted ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs text-muted">
                    {p.present}/{p.present + p.absent}
                  </span>
                  <span className="rounded-full bg-success/15 px-3 py-1 font-mono text-xs text-success">
                    {t("submitted")}
                  </span>
                </div>
              ) : (
                <span className="shrink-0 rounded-full bg-error/10 px-3 py-1 font-mono text-xs text-error">
                  {t("pending")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
