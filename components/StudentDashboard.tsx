"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { OfflineLessons } from "./OfflineLessons";
import { recordResourceView } from "@/app/student/actions";
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
  quizzes: { id: string; title: string; subject: string; questions: number; score: number | null; due: string | null; closed: boolean }[];
  events: { title: string; startDate: string; endDate: string | null; note: string | null }[];
};

export function StudentDashboard({ data }: { data: StudentData }) {
  const { t, locale } = useI18n();
  const first = data.name.split(" ")[0] || data.name;
  const hour = new Date().getHours();
  const greet = hour < 12 ? (locale === "fr" ? "Bonjour" : "Good morning") : hour < 17 ? (locale === "fr" ? "Bon après-midi" : "Good afternoon") : (locale === "fr" ? "Bonsoir" : "Good evening");

  return (
    <>
      <h1 className="font-display text-xl font-semibold">{greet}, {first}</h1>
          <p className="text-[12.5px] text-muted">{data.school} · {data.className}</p>

          <div className="et-anim mt-3 flex flex-col gap-3">
            {/* Chariot — AI study tutor */}
            <a href="/student/tutor" className="et-hero et-pop block p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl" style={{ background: "rgba(0,229,255,.16)" }}>
                  <Sparkles size={20} style={{ color: "#fff" }} aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <div className="font-display text-base font-semibold">{t("chariotNav")}</div>
                  <div className="text-[12.5px]" style={{ color: "var(--et-hero-sub)" }}>{t("chariotTagline")}</div>
                </div>
                <ArrowRight size={18} style={{ color: "var(--et-hero-sub)" }} aria-hidden="true" />
              </div>
              <div className="mt-3 rounded-xl px-3 py-2.5 text-[13px]" style={{ background: "rgba(255,255,255,.08)", color: "var(--et-hero-sub)" }}>
                {t("chariotTagline")}
              </div>
            </a>

            {/* Attendance */}
            <section className="et-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted">{t("attendanceToday")}</h2>
                <span className="font-display text-3xl font-bold tabular-nums">{data.rate === null ? "—" : `${data.rate}%`}</span>
              </div>
              {data.recent.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.recent.map((d, j) => (
                    <span key={j} title={d.date} className="rounded-md px-2 py-1 font-mono text-[11px]"
                      style={{ background: d.absent ? "var(--et-danger-bg)" : "var(--et-ok-bg)", color: d.absent ? "var(--et-danger)" : "var(--et-ok)" }}>
                      {d.date} {d.absent ? "A" : "P"}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Quizzes */}
            {data.quizzes.length > 0 && (
              <section className="et-card p-4">
                <h2 className="mb-2 text-xs font-semibold text-muted">{t("quizzesNav")}</h2>
                <ul className="space-y-2">
                  {data.quizzes.map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{q.title}</div>
                        <div className="font-mono text-xs text-muted">
                          {q.subject} · {q.questions} {t("quizQs")}
                          {q.due && <span className={q.closed && q.score === null ? "text-danger" : "text-primary"}> · {t("quizDue")} {q.due}</span>}
                        </div>
                      </div>
                      {q.score !== null ? (
                        <span className="shrink-0 rounded-full px-3 py-1 font-mono text-xs font-bold" style={{ background: "var(--et-ok-bg)", color: "var(--et-ok)" }}>{q.score}%</span>
                      ) : q.closed ? (
                        <span className="shrink-0 rounded-full px-3 py-1 font-mono text-xs" style={{ background: "var(--et-danger-bg)", color: "var(--et-danger)" }}>{t("quizClosed")}</span>
                      ) : (
                        <a href={`/student/quiz/${q.id}`} className="et-btn shrink-0 px-4 py-2 text-xs">{t("quizTake")}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Grades */}
            {data.subjects.length > 0 && (
              <section className="et-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-muted">{t("gradesTitle")}</h2>
                  <span className="text-xs text-muted">{t("overallAvg")}: <b className="text-ink">{data.overall === null ? "—" : `${data.overall}/20`}</b></span>
                </div>
                <ul className="space-y-1">
                  {data.subjects.map((s) => (
                    <li key={s.subject} className="flex items-center justify-between text-sm">
                      <span>{s.subject}</span>
                      <span className="font-mono tabular-nums text-muted">{s.avg === null ? "—" : `${s.avg}/20`}</span>
                    </li>
                  ))}
                </ul>
                <a href={`/report/${data.studentId}`} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
                  {t("viewReport")} <ArrowRight size={15} aria-hidden="true" />
                </a>
              </section>
            )}

            {/* Events */}
            {data.events.length > 0 && (
              <section className="et-card p-5">
                <h2 className="mb-2 text-xs font-semibold text-muted">{t("upcomingEvents")}</h2>
                <ul className="space-y-1.5">
                  {data.events.map((e, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0">{e.title}{e.note && <span className="text-muted"> · {e.note}</span>}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-primary">{e.startDate.slice(5)}{e.endDate ? ` → ${e.endDate.slice(5)}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Lessons */}
            <div>
              <h2 className="mb-2 text-xs font-semibold text-muted">{t("resourcesNav")}</h2>
              <OfflineLessons lessons={data.lessons} studentName={data.name} />
              {data.lessons.length === 0 ? (
                <p className="et-card px-4 py-5 text-center text-muted">{t("resNone")}</p>
              ) : (
                <div className="space-y-3">
                  {data.lessons.map((g) => (
                    <section key={g.subject} className="et-card p-5">
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">{g.subject}</h3>
                      <ul className="space-y-2">
                        {g.items.map((item) => (
                          <li key={item.id} className="rounded-xl border border-line bg-chip p-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium">{item.title}</span>
                              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase" style={{ background: "var(--et-blue-bg)", color: "var(--et-primary)" }}>
                                {item.type === "LINK" ? t("resTypeLink") : t("resTypeNote")}
                              </span>
                            </div>
                            {item.type === "LINK" && item.url ? (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => void recordResourceView(item.id)}
                                className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
                                {t("resOpen")} <ArrowRight size={13} aria-hidden="true" />
                              </a>
                            ) : (
                              <details onToggle={(e) => (e.target as HTMLDetailsElement).open && void recordResourceView(item.id)}>
                                <summary className="mt-1 cursor-pointer font-mono text-xs uppercase tracking-widest text-primary">{t("libRead")}</summary>
                                <p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p>
                              </details>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
    </>
  );
}
