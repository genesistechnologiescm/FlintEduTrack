"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle, ArrowRight, BookOpen, Calendar, CalendarX, CheckCircle2, FilePen, FileText,
  GraduationCap, Heart, ListChecks, Megaphone, MessageCircle, Phone, Settings,
  ShieldCheck, Users, Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";

type Period = { id: string; subject: string; className: string; teacher: string; time: string; submitted: boolean; present: number; absent: number };

export type AdminData = {
  schoolName: string;
  attendanceRate: number | null;
  periodsSubmitted: number;
  periodsScheduled: number;
  absencesToday: number;
  studentsEnrolled: number;
  periods: Period[];
  alerts: { sent: number; queued: number; costFcfa: number; recent: { phone: string; status: string }[] };
  reach: { smartphone: number; whatsapp: number; smsOnly: number; unknown: number; total: number };
  gate: { name: string; title: string | null; time: string | null; onTime: boolean | null }[];
};

const R = 40;
const C = 2 * Math.PI * R;
const heroTone = (r: number) => (r < 75 ? "#ff6b6b" : r < 90 ? "#ffb020" : "#2fe0a5");

export function AdminDashboard({ data }: { data: AdminData }) {
  const { t } = useI18n();
  const rate = data.attendanceRate ?? 0;
  const [pct, setPct] = useState(0);
  const [offset, setOffset] = useState(C);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const target = C * (1 - rate / 100);
    if (reduce) { setPct(rate); setOffset(target); return; }
    setPct(0); setOffset(C);
    const raf1 = requestAnimationFrame(() => setOffset(target));
    let raf2 = 0; const start = performance.now();
    const step = (n: number) => { const p = Math.min((n - start) / 900, 1); setPct(Math.round(rate * p)); if (p < 1) raf2 = requestAnimationFrame(step); };
    raf2 = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [rate]);

  const manage: [string, string, typeof Users][] = [
    ["/admin/setup", t("setupNav"), Settings],
    ["/admin/students", t("manageStudents"), Users],
    ["/admin/teachers", t("manageTeachers"), GraduationCap],
    ["/grades", t("gradesNav"), FileText],
    ["/admin/corrections", t("correctionsNav"), FilePen],
    ["/admin/calendar", t("calendarNav"), Calendar],
    ["/admin/absences", t("absencesNav"), CalendarX],
    ["/wellbeing", t("wellbeingNav"), Heart],
    ["/admin/announcements", t("announcementsNav"), Megaphone],
    ["/admin/messages", t("messagesNav"), MessageCircle],
    ["/admin/resources", t("resourcesNav"), BookOpen],
    ["/admin/quizzes", t("quizzesNav"), ListChecks],
    ["/admin/fees", t("feesNav"), Wallet],
    ["/admin/staff", t("staffNav"), ShieldCheck],
    ["/ussd-demo", t("ussdNav"), Phone],
  ];

  return (
    <>
      <h1 className="font-display text-2xl font-bold tracking-tight">{t("adminTitle")}</h1>
          <p className="text-[12.5px] text-muted">{data.schoolName} · {data.studentsEnrolled} {t("studentsWord")}</p>

          <div className="et-anim mt-3 flex flex-col gap-3">
            {/* School-pulse hero */}
            <section className="et-hero et-pop p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="font-display text-[15px] font-semibold">{data.schoolName}</div>
                <div className="text-[11.5px]" style={{ color: "var(--et-hero-sub)" }}>{t("attendanceToday")}</div>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative" style={{ width: 96, height: 96, flex: "none" }}>
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r={R} fill="none" strokeWidth="9" style={{ stroke: "var(--et-hero-track)" }} />
                    <circle cx="48" cy="48" r={R} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 48 48)" style={{ stroke: heroTone(rate), transition: "stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)" }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-display text-2xl font-bold" style={{ color: heroTone(rate) }}>
                    {data.attendanceRate === null ? "—" : `${pct}%`}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[11.5px]" style={{ color: "var(--et-hero-sub)" }}>{t("absencesToday")}</div>
                  <div className="font-display text-2xl font-bold" style={{ color: data.absencesToday > 0 ? "#ff6b6b" : "#fff" }}>{data.absencesToday}</div>
                  <div className="mt-2 text-[11.5px]" style={{ color: "var(--et-hero-sub)" }}>
                    {t("periodsSubmitted")} <span className="font-semibold text-white">{data.periodsSubmitted}/{data.periodsScheduled}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Dropout-risk radar */}
            <a href="/admin/risk" className="et-card flex items-center gap-3 p-4" style={{ background: "var(--et-danger-bg)", borderColor: "transparent" }}>
              <AlertTriangle size={20} className="shrink-0" style={{ color: "var(--et-danger)" }} aria-hidden="true" />
              <span className="flex-1 font-medium">{t("riskNav")}</span>
              <ArrowRight size={16} style={{ color: "var(--et-danger)" }} aria-hidden="true" />
            </a>

            {/* Welfare */}
            <a href="/admin/welfare" className="et-card flex items-center gap-3 p-4">
              <Heart size={20} className="shrink-0 text-primary" aria-hidden="true" />
              <span className="flex-1 font-medium">{t("welfareCta")}</span>
              <ArrowRight size={16} className="text-primary" aria-hidden="true" />
            </a>

            {/* Parent alerts today */}
            <section className="et-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-muted">{t("alertsTitle")}</h2>
                <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--et-warn-bg)", color: "var(--et-warn)" }}>{t("alertsMock")}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[[data.alerts.sent, t("alertsSent")], [data.alerts.queued, t("alertsQueued")], [data.alerts.costFcfa, `${t("alertsCost")} · FCFA`]].map(([v, l], i) => (
                  <div key={i}>
                    <div className="font-display text-2xl font-bold tabular-nums">{v}</div>
                    <div className="font-mono text-xs text-muted">{l}</div>
                  </div>
                ))}
              </div>
              {data.reach.total > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted">{t("reachTitle")}</span>
                    <span className="font-mono text-xs"><b style={{ color: "var(--et-danger)" }}>{data.reach.smsOnly}</b><span className="text-muted">/{data.reach.total} {t("reachNeedSms")}</span></span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
                    <span className="rounded-full px-2 py-0.5" style={{ background: "var(--et-ok-bg)", color: "var(--et-ok)" }}>{data.reach.smartphone} {t("capSmartShort")}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ background: "var(--et-blue-bg)", color: "var(--et-primary)" }}>{data.reach.whatsapp} {t("capWaShort")}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ background: "var(--et-danger-bg)", color: "var(--et-danger)" }}>{data.reach.smsOnly} {t("capSmsShort")}</span>
                    {data.reach.unknown > 0 && <span className="rounded-full bg-chip px-2 py-0.5 text-muted">{data.reach.unknown} {t("capUnkShort")}</span>}
                  </div>
                </div>
              )}
            </section>

            {/* Staff on site */}
            {data.gate.length > 0 && (
              <section className="et-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-muted">{t("gateAdminTitle")}</h2>
                  <span className="font-mono text-xs tabular-nums">{data.gate.filter((g) => g.time).length}/{data.gate.length}</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {data.gate.map((g, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{g.name}{g.title && <span className="ml-1.5 font-mono text-[10px] uppercase text-muted">{g.title}</span>}</span>
                      {g.time ? (
                        <span className="shrink-0 font-mono text-xs tabular-nums" style={{ color: g.onTime ? "var(--et-ok)" : "var(--et-warn)" }}>{g.time} · {g.onTime ? t("gateOnTime") : t("gateLate")}</span>
                      ) : (
                        <span className="shrink-0 font-mono text-xs text-muted">{t("gateNotYet")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Today's periods */}
            <section className="et-card p-4">
              <h2 className="mb-2 text-xs font-semibold text-muted">{t("todaysPeriods")}</h2>
              {data.periods.length === 0 ? (
                <p className="py-4 text-center text-muted">{t("noPeriods")}</p>
              ) : (
                <ul className="space-y-2">
                  {data.periods.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.subject} · {p.className}</div>
                        <div className="truncate font-mono text-xs text-muted">{p.time} · {p.teacher}</div>
                      </div>
                      {p.submitted ? (
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-xs text-muted">{p.present}/{p.present + p.absent}</span>
                          <span className="et-pill" style={{ background: "var(--et-ok-bg)", color: "var(--et-ok)" }}><CheckCircle2 size={13} /> {t("submitted")}</span>
                        </span>
                      ) : (
                        <span className="et-pill shrink-0" style={{ background: "var(--et-danger-bg)", color: "var(--et-danger)" }}>{t("pending")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Manage */}
            <section className="et-card p-4">
              <h2 className="mb-3 text-xs font-semibold text-muted">{t("setupNav")}</h2>
              <div className="grid grid-cols-3 gap-2.5">
                {manage.map(([href, label, Icon]) => (
                  <a key={href + label} href={href} className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3 text-center text-[11px] font-medium">
                    <span className="grid size-9 place-items-center rounded-lg bg-blue-bg"><Icon size={18} className="text-primary" aria-hidden="true" /></span>
                    <span className="leading-tight">{label}</span>
                  </a>
                ))}
              </div>
            </section>
          </div>
    </>
  );
}
