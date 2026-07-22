"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { PERIODS, BREAK_AFTER, DAYS } from "@/lib/timetable";
import { setSlot, removeSlot } from "@/app/admin/timetable/actions";

export type TimetableData = {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  slots: {
    id: string;
    classGroupId: string;
    dayOfWeek: number;
    startTime: string;
    subjectName: string;
    teacherName: string;
    room: string | null;
  }[];
};

const STR = {
  en: {
    title: "Timetable",
    sub: "One week per class. Tap an empty period to add a lesson.",
    classLabel: "Class",
    noClasses: "Add a class first, in School setup, then come back to build its timetable.",
    noStaff: "Add teachers first, in Teachers, so lessons can be assigned to someone.",
    noSubjects: "Add subjects first, in School setup.",
    empty: "No lessons yet for this class. Tap any empty period to start.",
    addTitle: "Add a lesson",
    subject: "Subject",
    teacher: "Teacher",
    room: "Room (optional)",
    cancel: "Cancel",
    save: "Add lesson",
    saving: "Adding…",
    removing: "Removing…",
    remove: "Remove this lesson",
    periods: "Period",
    lessonsCount: (n: number) => `${n} lesson${n === 1 ? "" : "s"} this week`,
  },
  fr: {
    title: "Emploi du temps",
    sub: "Une semaine par classe. Touchez une période vide pour ajouter un cours.",
    classLabel: "Classe",
    noClasses: "Ajoutez d'abord une classe, dans Configuration, puis revenez créer son emploi du temps.",
    noStaff: "Ajoutez d'abord des enseignants, dans Enseignants, pour pouvoir leur attribuer des cours.",
    noSubjects: "Ajoutez d'abord des matières, dans Configuration.",
    empty: "Aucun cours pour cette classe. Touchez une période vide pour commencer.",
    addTitle: "Ajouter un cours",
    subject: "Matière",
    teacher: "Enseignant",
    room: "Salle (facultatif)",
    cancel: "Annuler",
    save: "Ajouter le cours",
    saving: "Ajout…",
    removing: "Suppression…",
    remove: "Supprimer ce cours",
    periods: "Période",
    lessonsCount: (n: number) => `${n} cours cette semaine`,
  },
};

export function TimetableManager({ data }: { data: TimetableData }) {
  const { locale } = useI18n();
  const s = STR[locale as "en" | "fr"] ?? STR.en;
  const router = useRouter();

  const [classId, setClassId] = useState(data.classes[0]?.id ?? "");
  const [draft, setDraft] = useState<{ day: number; start: string } | null>(null);
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(data.teachers[0]?.id ?? "");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  // slots for the selected class, keyed "day|start" for O(1) cell lookup
  const byCell = useMemo(() => {
    const m = new Map<string, TimetableData["slots"][number]>();
    for (const sl of data.slots) {
      if (sl.classGroupId === classId) m.set(`${sl.dayOfWeek}|${sl.startTime}`, sl);
    }
    return m;
  }, [data.slots, classId]);

  if (data.classes.length === 0) {
    return (
      <div className="et-card p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">{s.title}</h1>
        <p className="mt-3 text-sm text-sub">{s.noClasses}</p>
      </div>
    );
  }

  const blocked = data.teachers.length === 0 ? s.noStaff : data.subjects.length === 0 ? s.noSubjects : null;

  async function submit() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await setSlot({
        classGroupId: classId,
        subjectId,
        teacherUserId: teacherId,
        dayOfWeek: draft.day,
        startTime: draft.start,
        room: room.trim() || undefined,
      });
      if (res.ok) {
        setDraft(null);
        setRoom("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not add the lesson");
      }
    } catch {
      setError("Could not add the lesson");
    } finally {
      setBusy(false);
    }
  }

  async function drop(id: string) {
    setPendingRemove(id);
    setError(null);
    try {
      const res = await removeSlot(id);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not remove the lesson");
    } catch {
      setError("Could not remove the lesson");
    } finally {
      setPendingRemove(null);
    }
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">{s.title}</h1>
        <p className="mt-0.5 text-sm text-muted">{s.sub}</p>
      </div>

      <div className="et-card mb-4 p-4">
        <label htmlFor="tt-class" className="et-label">
          {s.classLabel}
        </label>
        <select
          id="tt-class"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setDraft(null);
            setError(null);
          }}
          className="et-input mt-1 w-full"
        >
          {data.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted">
          {s.lessonsCount(byCell.size)}
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {blocked && <p className="mb-4 rounded-lg border border-line bg-chip px-4 py-3 text-sm text-sub">{blocked}</p>}
      {byCell.size === 0 && !blocked && <p className="mb-4 text-sm text-sub">{s.empty}</p>}

      {/* The week. Wide on purpose, so it scrolls inside its own box rather
          than making the whole page scroll sideways on a phone. */}
      <div className="et-card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                {s.periods}
              </th>
              {DAYS.map((d) => (
                <th key={d.value} scope="col" className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                  {locale === "fr" ? d.shortFr : d.shortEn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p, i) => (
              <Fragment key={p.start}>
                <tr className="border-t border-line align-top">
                  <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 font-mono text-[11px] font-normal text-sub">
                    {p.start}
                  </th>
                  {DAYS.map((d) => {
                    const slot = byCell.get(`${d.value}|${p.start}`);
                    if (slot) {
                      const removing = pendingRemove === slot.id;
                      return (
                        <td key={d.value} className="p-1">
                          <div className="group relative min-h-[44px] rounded-lg border border-primary/25 bg-primary/10 px-2 py-1.5">
                            <span className="block truncate text-[13px] font-medium text-ink">{slot.subjectName}</span>
                            <span className="block truncate text-[11px] text-sub">{slot.teacherName}</span>
                            {slot.room && <span className="block truncate font-mono text-[10px] text-muted">{slot.room}</span>}
                            <button
                              type="button"
                              onClick={() => drop(slot.id)}
                              disabled={removing}
                              aria-label={`${s.remove}: ${slot.subjectName}`}
                              title={s.remove}
                              className="absolute right-0.5 top-0.5 grid h-7 w-7 place-items-center rounded-md text-muted opacity-0 transition hover:bg-danger/15 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-60"
                            >
                              {removing ? <X className="h-3.5 w-3.5 animate-pulse" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      );
                    }
                    const isOpen = draft?.day === d.value && draft?.start === p.start;
                    return (
                      <td key={d.value} className="p-1">
                        <button
                          type="button"
                          disabled={!!blocked}
                          onClick={() => {
                            setDraft(isOpen ? null : { day: d.value, start: p.start });
                            setError(null);
                          }}
                          aria-label={`${s.addTitle}: ${locale === "fr" ? d.fr : d.en} ${p.start}`}
                          className={`grid min-h-[44px] w-full place-items-center rounded-lg border border-dashed transition ${
                            isOpen ? "border-primary bg-primary/10 text-primary" : "border-line text-muted hover:border-primary/40 hover:text-primary"
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </td>
                    );
                  })}
                </tr>
                {BREAK_AFTER.has(i) && (
                  <tr className="border-t border-line">
                    <td colSpan={DAYS.length + 1} className="bg-chip px-3 py-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
                      {BREAK_AFTER.get(i)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {draft && !blocked && (
        <div className="et-card mt-4 p-4">
          <h2 className="font-display text-base font-semibold text-ink">
            {s.addTitle} · {locale === "fr" ? DAYS.find((d) => d.value === draft.day)?.fr : DAYS.find((d) => d.value === draft.day)?.en} {draft.start}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="tt-subject" className="et-label">
                {s.subject} *
              </label>
              <select id="tt-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="et-input mt-1 w-full">
                {data.subjects.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tt-teacher" className="et-label">
                {s.teacher} *
              </label>
              <select id="tt-teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="et-input mt-1 w-full">
                {data.teachers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tt-room" className="et-label">
                {s.room}
              </label>
              <input id="tt-room" value={room} onChange={(e) => setRoom(e.target.value)} maxLength={30} className="et-input mt-1 w-full" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={submit} disabled={busy} className="et-btn min-h-[44px] disabled:opacity-60">
              {busy ? s.saving : s.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              className="min-h-[44px] rounded-lg border border-line px-4 text-sm text-sub hover:text-ink"
            >
              {s.cancel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
