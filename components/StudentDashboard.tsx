"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { LogoutButton } from "./LogoutButton";
import type { SubjectGrade } from "@/lib/grades";

type Lesson = { id: string; title: string; type: "LINK" | "NOTE"; url: string | null; body: string | null };
export type StudentData = {
  name: string;
  school: string;
  className: string;
  studentId: string;
  rate: number | null;
  recent: { date: string; absent: boolean }[];
  subjects: SubjectGrade[];
  overall: number | null;
  lessons: { subject: string; items: Lesson[] }[];
};

export function StudentDashboard({ data }: { data: StudentData }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-flint-black">{data.name}</h1>
          <p className="font-mono text-xs text-muted">
            {data.school} · {data.className}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LanguageToggle />
          <LogoutButton />
        </div>
      </header>

      {/* Attendance */}
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">{t("attendanceToday")}</h2>
          <span className="font-display text-3xl font-bold tabular-nums text-flint-black">
            {data.rate === null ? "—" : `${data.rate}%`}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.recent.map((d, j) => (
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
      </section>

      {/* Grades */}
      {data.subjects.length > 0 && (
        <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">{t("gradesTitle")}</h2>
            <span className="font-mono text-xs text-muted">
              {t("overallAvg")}:{" "}
              <span className="font-bold text-flint-black">{data.overall === null ? "—" : `${data.overall}/20`}</span>
            </span>
          </div>
          <ul className="space-y-1">
            {data.subjects.map((s) => (
              <li key={s.subject} className="flex items-center justify-between text-sm">
                <span className="text-flint-black">{s.subject}</span>
                <span className="font-mono tabular-nums text-muted">{s.avg === null ? "—" : `${s.avg}/20`}</span>
              </li>
            ))}
          </ul>
          <a
            href={`/report/${data.studentId}`}
            className="mt-3 inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline"
          >
            {t("viewReport")} →
          </a>
        </section>
      )}

      {/* Lessons */}
      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("resourcesNav")}</h2>
      {data.lessons.length === 0 ? (
        <p className="rounded-xl border border-black/10 bg-white px-4 py-5 text-center text-muted">{t("resNone")}</p>
      ) : (
        <div className="space-y-4">
          {data.lessons.map((g) => (
            <section key={g.subject} className="rounded-2xl border border-black/10 bg-white p-5">
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">{g.subject}</h3>
              <ul className="space-y-2">
                {g.items.map((item) => (
                  <li key={item.id} className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-flint-black">{item.title}</span>
                      <span className="shrink-0 rounded-full bg-flint-blue/10 px-2 py-0.5 font-mono text-[10px] uppercase text-flint-blue">
                        {item.type === "LINK" ? t("resTypeLink") : t("resTypeNote")}
                      </span>
                    </div>
                    {item.type === "LINK" && item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex min-h-9 items-center font-mono text-xs text-flint-blue hover:underline"
                      >
                        {t("resOpen")} →
                      </a>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-flint-black">{item.body}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
