"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { loadRoster, saveGrades, type RosterRow } from "@/app/grades/actions";

type Component = { id: string; name: string; weight: number };

export type GradeEntryData = {
  schoolName: string;
  isAdmin: boolean;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  terms: { id: string; label: string; sequenceCount: number }[];
};

const field = "min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base";

export function GradeEntry({ data }: { data: GradeEntryData }) {
  const { t } = useI18n();
  const [classGroupId, setClassGroupId] = useState(data.classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const [termId, setTermId] = useState(data.terms[0]?.id ?? "");
  const [sequence, setSequence] = useState("1");

  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  // Component mode: compScores[studentId][componentId] = raw input.
  const [compScores, setCompScores] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const ready = classGroupId && subjectId && termId;
  const seqCount = useMemo(
    () => data.terms.find((tm) => tm.id === termId)?.sequenceCount ?? 2,
    [data.terms, termId],
  );

  async function onLoad() {
    if (!ready) return;
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const payload = await loadRoster({ classGroupId, subjectId, termId, sequence: Number(sequence) });
      setRoster(payload.rows);
      setComponents(payload.components);
      setScores(Object.fromEntries(payload.rows.map((r) => [r.studentId, r.score === null ? "" : String(r.score)])));
      setCompScores({});
    } catch {
      setErr(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  // Weighted preview shown per row; the SERVER recomputes it authoritatively.
  function weightedOf(studentId: string): number | null {
    const row = compScores[studentId];
    if (!row) return null;
    let total = 0;
    for (const c of components) {
      const raw = (row[c.id] ?? "").trim();
      if (raw === "") return null;
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0 || n > 20) return null;
      total += n * (c.weight / 100);
    }
    return Math.min(20, Math.round(total * 100) / 100);
  }

  async function onSave() {
    if (!roster) return;
    const payload: { studentId: string; score?: number; components?: { componentId: string; score: number }[] }[] = [];
    if (components.length > 0) {
      for (const r of roster) {
        const row = compScores[r.studentId];
        if (!row) continue;
        const filled = components.map((c) => (row[c.id] ?? "").trim());
        if (filled.every((v) => v === "")) continue; // untouched row
        if (filled.some((v) => v === "")) {
          setErr(t("caIncomplete"));
          return;
        }
        const comps = components.map((c) => {
          const n = Number((row[c.id] ?? "").trim());
          return { componentId: c.id, score: Math.round(n * 100) / 100 };
        });
        if (comps.some((c) => Number.isNaN(c.score) || c.score < 0 || c.score > 20)) {
          setErr(t("badScore"));
          return;
        }
        payload.push({ studentId: r.studentId, components: comps });
      }
    } else {
      for (const r of roster) {
        const raw = (scores[r.studentId] ?? "").trim();
        if (raw === "") continue;
        const n = Number(raw);
        if (Number.isNaN(n) || n < 0 || n > 20) {
          setErr(t("badScore"));
          return;
        }
        payload.push({ studentId: r.studentId, score: Math.round(n * 100) / 100 });
      }
    }
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await saveGrades({ classGroupId, subjectId, termId, sequence: Number(sequence), scores: payload });
      if (res.ok) {
        const parts = [`${t("savedMarks")}: ${res.saved}`];
        if (res.pending > 0) parts.push(`${res.pending} ${t("corrSentForApproval")}`);
        setMsg(parts.join(" · "));
      } else setErr(res.error ?? "error");
    } finally {
      setSaving(false);
    }
  }

  const noTerms = data.terms.length === 0;

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href={data.isAdmin ? "/admin" : "/attendance"} className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {data.isAdmin ? t("backDash") : t("backAttendance")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("enterGrades")}</h1>
          <p className="text-muted">{data.schoolName}</p>
        </div>
        <LanguageToggle />
      </header>

      {noTerms ? (
        <p className="rounded-2xl border border-black/10 bg-white px-4 py-6 text-center text-muted">
          {t("noTermsYet")}
        </p>
      ) : (
        <>
          <section className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldClass")}</span>
                <select className={field} value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)}>
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 text-sm">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldSubject")}</span>
                <select className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  {data.subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldTerm")}</span>
                <select className={field} value={termId} onChange={(e) => setTermId(e.target.value)}>
                  {data.terms.map((tm) => (
                    <option key={tm.id} value={tm.id}>{tm.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldSequence")}</span>
                <select className={field} value={sequence} onChange={(e) => setSequence(e.target.value)}>
                  {Array.from({ length: seqCount }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{t("seqWord")} {n}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={onLoad}
              disabled={!ready || loading}
              className="mt-4 min-h-11 w-full rounded-full border border-flint-blue/30 font-mono text-xs uppercase tracking-widest text-flint-blue disabled:opacity-60"
            >
              {loading ? t("adding") : t("loadClass")}
            </button>
          </section>

          {roster && (
            <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5">
              {roster.length === 0 ? (
                <p className="py-4 text-center text-muted">{t("noStudents")}</p>
              ) : (
                <>
                  {components.length > 0 && (
                    <p className="mb-2 rounded-lg bg-flint-blue/5 px-3 py-2 font-mono text-[11px] text-muted">
                      {components.map((c) => `${c.name} ×${c.weight}%`).join(" + ")} → /20
                    </p>
                  )}
                  <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted">
                    <span>{t("studentsWord")}</span>
                    <span>{components.length > 0 ? t("caTotalCol") : t("scoreOf20")}</span>
                  </div>
                  <ul className="divide-y divide-black/5">
                    {roster.map((r) =>
                      components.length > 0 ? (
                        <li key={r.studentId} className="py-2">
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-flint-black">{r.name}</span>
                            <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-flint-blue">
                              {weightedOf(r.studentId) ?? (r.score !== null ? `${r.score}` : "—")}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {components.map((c) => (
                              <label key={c.id} className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] uppercase text-muted">{c.name}</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={20}
                                  step={0.25}
                                  inputMode="decimal"
                                  aria-label={`${r.name} ${c.name}`}
                                  value={compScores[r.studentId]?.[c.id] ?? ""}
                                  onChange={(e) =>
                                    setCompScores((s) => ({
                                      ...s,
                                      [r.studentId]: { ...(s[r.studentId] ?? {}), [c.id]: e.target.value },
                                    }))
                                  }
                                  className="h-10 w-16 rounded-lg border border-black/15 bg-white px-1 text-center text-sm tabular-nums"
                                />
                              </label>
                            ))}
                          </div>
                        </li>
                      ) : (
                        <li key={r.studentId} className="flex items-center justify-between gap-3 py-2">
                          <span className="min-w-0 truncate text-flint-black">{r.name}</span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            step={0.25}
                            inputMode="decimal"
                            aria-label={`${r.name} ${t("scoreOf20")}`}
                            value={scores[r.studentId] ?? ""}
                            onChange={(e) => setScores((s) => ({ ...s, [r.studentId]: e.target.value }))}
                            className="h-11 w-20 rounded-lg border border-black/15 bg-white px-2 text-center text-base tabular-nums"
                          />
                        </li>
                      ),
                    )}
                  </ul>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="mt-4 min-h-11 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60"
                  >
                    {saving ? t("adding") : t("saveMarks")}
                  </button>
                </>
              )}
            </section>
          )}

          {msg && <p className="mt-3 text-center text-sm text-success">{msg}</p>}
          {err && <p className="mt-3 text-center text-sm text-error">{err}</p>}
        </>
      )}
    </main>
  );
}
