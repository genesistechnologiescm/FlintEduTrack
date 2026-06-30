"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { createQuiz, deleteQuiz } from "@/app/admin/quizzes/actions";

type QuizRow = { id: string; title: string; subject: string; target: string | null; questions: number; attempts: number; avgScore: number | null };
export type QuizManagerData = {
  schoolName: string;
  isAdmin: boolean;
  subjects: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  quizzes: QuizRow[];
};

type Draft = { prompt: string; options: string[]; correctIndex: number };
const blankQ = (): Draft => ({ prompt: "", options: ["", "", "", ""], correctIndex: 0 });
const field = "min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base";

export function QuizManager({ data }: { data: QuizManagerData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const [classGroupId, setClassGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Draft[]>([blankQ()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const noSubjects = data.subjects.length === 0;

  function setQ(i: number, patch: Partial<Draft>) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  }
  function setOpt(i: number, oi: number, val: string) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, options: q.options.map((o, k) => (k === oi ? val : o)) } : q)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await createQuiz({
      subjectId,
      classGroupId: classGroupId || undefined,
      title,
      questions: questions.map((q) => ({ prompt: q.prompt, options: q.options.filter((o) => o.trim()), correctIndex: q.correctIndex })),
    });
    setBusy(false);
    if (res.ok) {
      setTitle("");
      setQuestions([blankQ()]);
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  async function onDelete(id: string) {
    await deleteQuiz(id);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-[680px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href={data.isAdmin ? "/admin" : "/attendance"} className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {data.isAdmin ? t("backDash") : t("backAttendance")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("quizzesNav")}</h1>
          <p className="text-muted">{data.schoolName}</p>
        </div>
        <LanguageToggle />
      </header>

      {noSubjects ? (
        <p className="rounded-2xl border border-black/10 bg-white px-4 py-6 text-center text-muted">{t("resNoSubjects")}</p>
      ) : (
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-flint-black">{t("newQuiz")}</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select className={field} value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)}>
                <option value="">{t("resAllClasses")}</option>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <input className={field} placeholder={t("quizTitle")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required />

            {questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted">{t("quizQuestion")} {i + 1}</span>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} className="font-mono text-[11px] uppercase text-error hover:underline">
                      {t("resDelete")}
                    </button>
                  )}
                </div>
                <input className={`${field} mb-2`} placeholder={t("quizPrompt")} value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} maxLength={300} required />
                <div className="space-y-1.5">
                  {q.options.map((o, oi) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={q.correctIndex === oi}
                        onChange={() => setQ(i, { correctIndex: oi })}
                        className="size-4 shrink-0 accent-flint-blue"
                        aria-label={`${t("quizCorrect")} ${oi + 1}`}
                      />
                      <input
                        className="min-h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm"
                        placeholder={`${t("quizOption")} ${oi + 1}`}
                        value={o}
                        onChange={(e) => setOpt(i, oi, e.target.value)}
                        required={oi < 2}
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 font-mono text-[10px] text-muted">{t("quizCorrectHint")}</p>
              </div>
            ))}

            <button type="button" onClick={() => setQuestions((qs) => [...qs, blankQ()])} className="min-h-10 w-full rounded-full border border-flint-blue/30 font-mono text-xs uppercase tracking-widest text-flint-blue">
              + {t("quizAddQuestion")}
            </button>
            <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60">
              {busy ? t("adding") : t("quizPublish")}
            </button>
            {err && <p className="text-center text-sm text-error">{err}</p>}
          </form>
        </section>
      )}

      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("quizPublished")}</h2>
      {data.quizzes.length === 0 ? (
        <p className="rounded-xl border border-black/10 bg-white px-4 py-5 text-center text-muted">{t("quizNone")}</p>
      ) : (
        <ul className="space-y-3">
          {data.quizzes.map((q) => (
            <li key={q.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-flint-black">{q.title}</h3>
                  <p className="font-mono text-xs text-muted">{q.subject} · {q.target ?? t("resAllClasses")} · {q.questions} {t("quizQs")}</p>
                </div>
                <button type="button" onClick={() => onDelete(q.id)} className="shrink-0 font-mono text-[11px] uppercase text-error hover:underline">
                  {t("resDelete")}
                </button>
              </div>
              <div className="mt-2 flex gap-4 border-t border-black/5 pt-2 font-mono text-xs text-muted">
                <span>{q.attempts} {t("quizAttemptsWord")}</span>
                <span>{t("quizAvg")}: <span className="text-flint-black">{q.avgScore === null ? "—" : `${q.avgScore}%`}</span></span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
