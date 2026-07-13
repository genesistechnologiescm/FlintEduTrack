"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  FileText,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import type { SubjectGrade } from "@/lib/grades";
import { EnablePush } from "./EnablePush";

type Child = {
  studentId: string;
  name: string;
  school: string;
  className: string;
  rate: number | null;
  recent: { date: string; absent: boolean }[];
  bySubject: { subject: string; rate: number; total: number }[];
  subjects: SubjectGrade[];
  overall: number | null;
};

export type ParentData = {
  parentName: string;
  children: Child[];
  alerts: { type: string; date: string }[];
  announcements: { title: string; body: string; date: string }[];
  events: { school: string; title: string; startDate: string; endDate: string | null; note: string | null; national: boolean }[];
};

const STR = {
  en: {
    morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening",
    term: "Attendance this term", present: "present", recent: "Recent days",
    needs: "Needs attention", ok: "On track",
    missedMost: "has missed most classes this term", doingWell: "is doing well this term",
    missed: "Classes missed most", byClass: "Attendance by class",
    qaMsg: "Message", qaFees: "Pay fees", qaReport: "Report card",
    grades: "Grades", overall: "Overall", viewReport: "View report card",
    supTitle: "may need support", supBody: "The school has been told and is following up. You can message the teachers.",
    supCta: "Message the school", okTitle: "Doing great", okBody: "Keep it up. Attendance and grades are strong.",
    events: "Upcoming events", announcements: "From the school", alerts: "Recent alerts", natTag: "National",
    absenceAlert: "Absence alert", noAlerts: "No alerts. All good", noChildren: "No children linked yet.",
    navHome: "Home", navMsg: "Messages", navFees: "Fees", navLessons: "Lessons",
  },
  fr: {
    morning: "Bonjour", afternoon: "Bon après-midi", evening: "Bonsoir",
    term: "Présence ce trimestre", present: "présent", recent: "Jours récents",
    needs: "À surveiller", ok: "Sur la bonne voie",
    missedMost: "a manqué la plupart des cours ce trimestre", doingWell: "va bien ce trimestre",
    missed: "Cours les plus manqués", byClass: "Présence par cours",
    qaMsg: "Écrire", qaFees: "Payer", qaReport: "Bulletin",
    grades: "Notes", overall: "Moyenne", viewReport: "Voir le bulletin",
    supTitle: "a besoin de soutien", supBody: "L’école est informée et assure le suivi. Vous pouvez écrire aux enseignants.",
    supCta: "Contacter l’école", okTitle: "Très bien", okBody: "Continuez. Présence et notes solides.",
    events: "Événements à venir", announcements: "De l’école", alerts: "Alertes récentes", natTag: "National",
    absenceAlert: "Alerte d’absence", noAlerts: "Aucune alerte. Tout va bien", noChildren: "Aucun enfant associé.",
    navHome: "Accueil", navMsg: "Messages", navFees: "Frais", navLessons: "Leçons",
  },
};

function heroTone(r: number) {
  return r < 75 ? "#ff6b6b" : r < 90 ? "#ffb020" : "#2fe0a5";
}
function barTone(r: number) {
  return r < 75 ? "var(--et-danger)" : r < 90 ? "var(--et-warn)" : "var(--et-ok)";
}

const R = 40;
const C = 2 * Math.PI * R;

export function ParentDashboard({ data }: { data: ParentData }) {
  const { locale } = useI18n();
  const t = STR[locale];
  const [sel, setSel] = useState(0);
  const child = data.children[sel];
  const rate = child?.rate ?? 0;

  const [pct, setPct] = useState(0);
  const [offset, setOffset] = useState(C);

  useEffect(() => {
    if (!child) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const target = C * (1 - rate / 100);
    if (reduce) {
      setPct(rate);
      setOffset(target);
      return;
    }
    setPct(0);
    setOffset(C);
    const raf1 = requestAnimationFrame(() => setOffset(target));
    let raf2 = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / 900, 1);
      setPct(Math.round(rate * p));
      if (p < 1) raf2 = requestAnimationFrame(step);
    };
    raf2 = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [sel, rate, child]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? t.morning : hour < 17 ? t.afternoon : t.evening;
  const firstName = data.parentName.split(" ")[0] || data.parentName;
  const today = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <h1 className="font-display text-2xl font-bold tracking-tight">
            {greet}, {firstName}
          </h1>
          <p className="text-[12.5px] capitalize text-muted">{today}</p>

          {data.children.length > 1 && (
            <div className="mt-3 flex gap-2">
              {data.children.map((c, i) => (
                <button
                  key={c.studentId}
                  type="button"
                  onClick={() => setSel(i)}
                  aria-pressed={i === sel}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-[13px] font-medium ${
                    i === sel ? "border-primary bg-blue-bg" : "border-line bg-surface"
                  }`}
                >
                  {c.name.split(" ")[0]}
                </button>
              ))}
            </div>
          )}

          {!child ? (
            <div className="et-card mt-4 p-6 text-center text-muted">{t.noChildren}</div>
          ) : (
            <div className="et-anim mt-3 flex flex-col gap-3">
              {/* Hero */}
              <div className="et-hero et-pop p-4 text-white">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-9 place-items-center rounded-full text-[13px] font-semibold"
                    style={{ background: "rgba(255,255,255,.14)" }}
                  >
                    {child.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-base font-semibold">{child.name}</div>
                    <div className="text-xs" style={{ color: "var(--et-hero-sub)" }}>
                      {child.school} · {child.className}
                    </div>
                  </div>
                  <span
                    className="et-pill"
                    style={{
                      background: rate < 75 ? "rgba(255,176,32,.18)" : "rgba(47,224,165,.18)",
                      color: rate < 75 ? "#ffce7a" : "#7ff0cf",
                    }}
                  >
                    {rate < 75 ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                    {rate < 75 ? t.needs : t.ok}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative" style={{ width: 92, height: 92, flex: "none" }}>
                    <svg width="92" height="92" viewBox="0 0 92 92">
                      <circle cx="46" cy="46" r={R} fill="none" strokeWidth="9" style={{ stroke: "var(--et-hero-track)" }} />
                      <circle
                        cx="46"
                        cy="46"
                        r={R}
                        fill="none"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={C}
                        strokeDashoffset={offset}
                        transform="rotate(-90 46 46)"
                        style={{ stroke: heroTone(rate), transition: "stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="font-display text-2xl font-bold" style={{ color: heroTone(rate) }}>
                        {child.rate === null ? "—" : `${pct}%`}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--et-hero-sub)" }}>
                        {t.present}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11.5px]" style={{ color: "#fff" }}>
                      {t.term}
                    </div>
                    {child.recent.length > 0 && (
                      <>
                        <div className="mt-2 text-[11px]" style={{ color: "var(--et-hero-sub)" }}>
                          {t.recent}
                        </div>
                        <div className="mt-1 flex gap-1.5">
                          {child.recent.slice(0, 6).reverse().map((d, j) => (
                            <span
                              key={j}
                              title={d.date}
                              className="grid size-6 place-items-center rounded-md text-[10px]"
                              style={{
                                background: d.absent ? "rgba(255,107,107,.16)" : "rgba(47,224,165,.16)",
                                color: d.absent ? "#ff6b6b" : "#2fe0a5",
                              }}
                            >
                              {d.absent ? "A" : "P"}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {child.rate !== null && (
                  <p className="mt-3 text-[12.5px]" style={{ color: "var(--et-hero-sub)" }}>
                    {child.name.split(" ")[0]} {rate < 75 ? t.missedMost : t.doingWell}.
                  </p>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex gap-2.5">
                {[
                  { href: "/parent/messages", label: t.qaMsg, icon: MessageCircle },
                  { href: "/parent/fees", label: t.qaFees, icon: Wallet },
                  { href: `/report/${child.studentId}`, label: t.qaReport, icon: FileText },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <a
                      key={a.href}
                      href={a.href}
                      className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface py-3 text-[11.5px] font-medium"
                    >
                      <span className="grid size-10 place-items-center rounded-xl bg-blue-bg">
                        <Icon size={20} className="text-primary" aria-hidden="true" />
                      </span>
                      {a.label}
                    </a>
                  );
                })}
              </div>

              {/* Subject attendance */}
              {child.bySubject.length > 0 && (
                <div className="et-card p-4">
                  <div className="text-xs text-muted">{rate < 75 ? t.missed : t.byClass}</div>
                  {child.bySubject.slice(0, 4).map((s) => (
                    <div key={s.subject} className="mt-2 flex items-center gap-3">
                      <span className="w-24 text-[13px]">{s.subject}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-chip">
                        <span className="block h-full rounded-full" style={{ width: `${s.rate}%`, background: barTone(s.rate) }} />
                      </span>
                      <span className="w-9 text-right text-xs font-semibold" style={{ color: barTone(s.rate) }}>
                        {s.rate}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Grades */}
              {child.subjects.length > 0 && (
                <div className="et-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted">{t.grades}</span>
                    <span className="text-xs text-muted">
                      {t.overall}: <b className="text-ink">{child.overall === null ? "—" : `${child.overall}/20`}</b>
                    </span>
                  </div>
                  {child.subjects.slice(0, 4).map((s) => (
                    <div key={s.subject} className="flex items-center justify-between py-0.5 text-[13px]">
                      <span>{s.subject}</span>
                      <span className="font-mono text-muted">{s.avg === null ? "—" : `${s.avg}/20`}</span>
                    </div>
                  ))}
                  <a href={`/report/${child.studentId}`} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
                    {t.viewReport} <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </div>
              )}

              {/* Support / positive callout */}
              {child.rate !== null &&
                (rate < 75 ? (
                  <div className="et-card p-4" style={{ background: "var(--et-blue-bg)", borderColor: "transparent" }}>
                    <div className="flex gap-2.5">
                      <MessageCircle size={20} className="shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <div className="font-medium">{child.name.split(" ")[0]} {t.supTitle}</div>
                        <div className="mt-0.5 text-[13px] text-sub">{t.supBody}</div>
                      </div>
                    </div>
                    <a href="/parent/messages" className="et-btn mt-3 w-full py-2.5 text-sm">
                      <MessageCircle size={16} aria-hidden="true" /> {t.supCta}
                    </a>
                  </div>
                ) : (
                  <div className="et-card p-4" style={{ background: "var(--et-ok-bg)", borderColor: "transparent" }}>
                    <div className="flex gap-2.5">
                      <CheckCircle2 size={20} className="shrink-0 text-ok" aria-hidden="true" />
                      <div>
                        <div className="font-medium">{t.okTitle}</div>
                        <div className="mt-0.5 text-[13px] text-sub">
                          {child.name.split(" ")[0]} {t.doingWell}. {t.okBody}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Events */}
              {data.events.length > 0 && (
                <div className="et-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                    <Calendar size={16} className="text-primary" aria-hidden="true" /> {t.events}
                  </div>
                  {data.events.slice(0, 3).map((e, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-1.5 text-[13px]">
                      <span>
                        {e.title}
                        {e.national && (
                          <span className="ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[9px] font-semibold uppercase tracking-wide" style={{ background: "var(--et-blue-bg)", color: "var(--et-primary)" }}>
                            {t.natTag}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-primary">
                        {e.startDate.slice(5)}
                        {e.endDate ? `→${e.endDate.slice(5)}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Announcements */}
              {data.announcements.length > 0 && (
                <div className="et-card p-4">
                  <div className="mb-2 text-xs font-semibold">{t.announcements}</div>
                  {data.announcements.slice(0, 3).map((a, i) => (
                    <div key={i} className="border-t border-line py-2 first:border-0 first:pt-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{a.title}</span>
                        <span className="shrink-0 font-mono text-xs text-muted">{a.date}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-sub">{a.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Alerts */}
              <div className="et-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <Bell size={16} className="text-primary" aria-hidden="true" /> {t.alerts}
                  </span>
                  <EnablePush />
                </div>
                {data.alerts.length === 0 ? (
                  <p className="text-[13px] text-ok">{t.noAlerts}</p>
                ) : (
                  data.alerts.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 text-[13px]">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: "var(--et-danger)" }} />
                        {t.absenceAlert}
                      </span>
                      <span className="font-mono text-xs text-muted">{a.date}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
    </>
  );
}
