"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CloudOff,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { submitAttendance, type SubmitResult } from "@/app/attendance/actions";
import { checkInAtGate } from "@/app/gate/actions";
import { enqueue } from "@/lib/offline/queue";

type Student = { id: string; firstName: string; lastName: string };
type GateState = { time: string; onTime: boolean } | null;
type Note = { body: string; until: string; author: string };

const STR = {
  en: {
    morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening",
    arrive: "I've arrived", arrived: "Arrived", onTime: "on time", late: "late",
    cover: "Cover note", from: "from", present: "Present", absent: "Absent",
    roster: "Class register", students: "students", submit: "Submit attendance",
    submitting: "Sending…", sentTitle: "Attendance sent", sentBody: "%n absent of %t recorded. Parents notified.",
    queuedTitle: "Saved offline", queuedBody: "Saved on this device. Parents will be notified once you reconnect.",
    done: "Done", alertNote: "Parents of absent students get a free alert.",
    grades: "Grades", resources: "Resources", quizzes: "Quizzes", library: "Library", wellbeing: "Wellbeing", handover: "Handover",
    navToday: "Today", navGrades: "Grades", navLessons: "Library", navWell: "Wellbeing",
  },
  fr: {
    morning: "Bonjour", afternoon: "Bon après-midi", evening: "Bonsoir",
    arrive: "Je suis arrivé", arrived: "Arrivé", onTime: "à l'heure", late: "en retard",
    cover: "Note de remplacement", from: "de", present: "Présent", absent: "Absent",
    roster: "Liste d'appel", students: "élèves", submit: "Envoyer l'appel",
    submitting: "Envoi…", sentTitle: "Appel envoyé", sentBody: "%n absents sur %t enregistrés. Parents notifiés.",
    queuedTitle: "Enregistré hors ligne", queuedBody: "Enregistré sur cet appareil. Les parents seront notifiés à la reconnexion.",
    done: "Terminé", alertNote: "Les parents des absents reçoivent une alerte gratuite.",
    grades: "Notes", resources: "Ressources", quizzes: "Quiz", library: "Bibliothèque", wellbeing: "Bien-être", handover: "Passation",
    navToday: "Aujourd'hui", navGrades: "Notes", navLessons: "Biblio", navWell: "Bien-être",
  },
};

export function AttendanceMarker({
  slotId, dateISO, className, subjectName, periodLabel, students, teacherName, gate: gateInit, handover,
}: {
  slotId: string;
  dateISO: string;
  className: string;
  subjectName: string;
  periodLabel: string;
  students: Student[];
  teacherName: string;
  gate: GateState;
  handover: Note[];
}) {
  const { locale } = useI18n();
  const t = STR[locale];
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "queued">("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [gate, setGate] = useState<GateState>(gateInit);
  const [gateBusy, setGateBusy] = useState(false);

  const toggle = (id: string) =>
    setAbsent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function onSubmit() {
    setStatus("submitting");
    try {
      const res = await submitAttendance({ slotId, dateISO, absentStudentIds: [...absent] });
      setResult(res);
      setStatus("done");
    } catch {
      await enqueue({ slotId, dateISO, absentStudentIds: [...absent] });
      setStatus("queued");
    }
  }

  async function checkIn() {
    setGateBusy(true);
    try {
      const res = await checkInAtGate();
      if (res.ok && res.time) setGate({ time: res.time, onTime: !!res.onTime });
    } catch {
      // ignore — check-in is best-effort
    } finally {
      setGateBusy(false);
    }
  }

  if (status === "done" && result) {
    return <Outcome tone="ok" title={t.sentTitle} body={t.sentBody.replace("%n", String(result.absent)).replace("%t", String(result.total))} done={t.done} />;
  }
  if (status === "queued") {
    return <Outcome tone="warn" title={t.queuedTitle} body={t.queuedBody} done={t.done} />;
  }

  const presentCount = students.length - absent.size;
  const hour = new Date().getHours();
  const greet = hour < 12 ? t.morning : hour < 17 ? t.afternoon : t.evening;
  const first = teacherName.split(" ")[0] || teacherName;
  const today = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  const tools = [
    { href: "/grades", label: t.grades },
    { href: "/admin/resources", label: t.resources },
    { href: "/admin/quizzes", label: t.quizzes },
    { href: "/library", label: t.library },
    { href: "/wellbeing", label: t.wellbeing },
    { href: "/handover", label: t.handover },
  ];
  return (
    <>
      <h1 className="font-display text-2xl font-bold tracking-tight">{greet}, {first}</h1>
      <p className="text-[12.5px] capitalize text-muted">{today}</p>

      <div className="et-anim mt-3 flex flex-col gap-3">
            {/* Context + gate check-in */}
            <div className="et-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-semibold">{className}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">{subjectName} · {periodLabel}</div>
                </div>
                {gate ? (
                  <span
                    className="et-pill"
                    style={{
                      background: gate.onTime ? "var(--et-ok-bg)" : "var(--et-warn-bg)",
                      color: gate.onTime ? "var(--et-ok)" : "var(--et-warn)",
                    }}
                  >
                    <Check size={13} /> {t.arrived} {gate.time} · {gate.onTime ? t.onTime : t.late}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={checkIn}
                    disabled={gateBusy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-60"
                  >
                    <Clock size={14} /> {t.arrive}
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {tools.map((l) => (
                  <a key={l.href} href={l.href} className="text-xs font-medium text-primary">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Cover notes */}
            {handover.map((n, i) => (
              <div key={i} className="et-card p-4" style={{ background: "var(--et-warn-bg)", borderColor: "transparent" }}>
                <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--et-warn)" }}>
                  {t.cover} · {t.from} {n.author} · {n.until}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-sub">{n.body}</p>
              </div>
            ))}

            {/* Live tally */}
            <div className="flex gap-2.5">
              <div className="flex-1 rounded-2xl p-3" style={{ background: "var(--et-ok-bg)" }}>
                <div className="font-display text-2xl font-bold" style={{ color: "var(--et-ok)" }}>{presentCount}</div>
                <div className="text-[11.5px]" style={{ color: "var(--et-ok)" }}>{t.present}</div>
              </div>
              <div className="flex-1 rounded-2xl p-3" style={{ background: "var(--et-danger-bg)" }}>
                <div className="font-display text-2xl font-bold" style={{ color: "var(--et-danger)" }}>{absent.size}</div>
                <div className="text-[11.5px]" style={{ color: "var(--et-danger)" }}>{t.absent}</div>
              </div>
            </div>

            {/* Roster */}
            <div className="et-card px-3 py-1">
              <div className="flex items-center justify-between px-1 py-2 text-xs text-muted">
                <span>{t.roster}</span>
                <span>{students.length} {t.students}</span>
              </div>
              {students.map((s) => {
                const isAbsent = absent.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    aria-pressed={isAbsent}
                    className="flex w-full items-center gap-3 border-t border-line px-1 py-3 text-left first:border-0"
                    style={isAbsent ? { background: "var(--et-danger-bg)" } : undefined}
                  >
                    <span
                      className="grid size-8 place-items-center rounded-full text-[11px] font-semibold text-white"
                      style={{ background: isAbsent ? "var(--et-danger)" : "var(--et-primary)" }}
                    >
                      {(s.firstName[0] ?? "") + (s.lastName[0] ?? "")}
                    </span>
                    <span className="flex-1 text-[14px]">{s.lastName} {s.firstName}</span>
                    <span
                      className="et-pill"
                      style={
                        isAbsent
                          ? { background: "var(--et-danger)", color: "#fff" }
                          : { background: "var(--et-ok-bg)", color: "var(--et-ok)" }
                      }
                    >
                      {isAbsent ? t.absent : t.present}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

      {/* Submit bar */}
      <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
        <span className="text-xs text-muted">{t.alertNote}</span>
          <button
            type="button"
            onClick={onSubmit}
            disabled={status === "submitting"}
            className="et-btn ml-auto shrink-0 px-5 py-3 text-sm"
          >
            {status === "submitting" ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {t.submitting}
              </>
            ) : (
              <>
                {t.submit} · {absent.size} {t.absent} <ArrowRight size={16} />
              </>
            )}
          </button>
      </div>
    </>
  );
}

function Outcome({ tone, title, body, done }: { tone: "ok" | "warn"; title: string; body: string; done: string }) {
  const color = tone === "ok" ? "var(--et-ok)" : "var(--et-warn)";
  const bg = tone === "ok" ? "var(--et-ok-bg)" : "var(--et-warn-bg)";
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-ink">
      <div>
        <div className="mx-auto grid size-16 place-items-center rounded-full" style={{ background: bg }}>
          {tone === "ok" ? (
            <CheckCircle2 size={30} style={{ color }} />
          ) : (
            <CloudOff size={30} style={{ color }} />
          )}
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">{title}</h1>
        <p className="mx-auto mt-2 max-w-[320px] text-muted">{body}</p>
        <a href="/attendance" className="et-btn mt-8 px-6 py-3 text-sm">{done}</a>
      </div>
    </div>
  );
}
