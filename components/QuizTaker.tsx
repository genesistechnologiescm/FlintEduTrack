"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { submitQuiz } from "@/app/student/actions";

export type TakerQuestion = { id: string; prompt: string; options: string[] };

export function QuizTaker({
  quizId,
  title,
  questions,
  alreadyScore,
}: {
  quizId: string;
  title: string;
  questions: TakerQuestion[];
  alreadyScore: number | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const done = alreadyScore !== null;
  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const ordered = questions.map((_, i) => answers[i] ?? -1);
    const res = await submitQuiz({ quizId, answers: ordered });
    setBusy(false);
    if (res.ok && res.score !== undefined) {
      setResult({ score: res.score, correct: res.correct ?? 0, total: res.total ?? questions.length });
    } else setErr(res.error ?? "error");
  }

  return (
    <>
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight">{title}</h1>

      {done || result ? (
          <div className="et-card p-6 text-center" style={{ background: "var(--et-ok-bg)", borderColor: "transparent" }}>
            <div className="text-xs uppercase tracking-widest text-muted">{t("quizYourScore")}</div>
            <div className="mt-1 font-display text-5xl font-bold tabular-nums" style={{ color: "var(--et-ok)" }}>
              {result ? result.score : alreadyScore}%
            </div>
            {result && <div className="mt-1 font-mono text-xs text-muted">{result.correct}/{result.total} {t("quizCorrectCount")}</div>}
            <button onClick={() => router.push("/student")} className="et-btn mt-4 px-6 py-3 text-sm">{t("backStudent")}</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {questions.map((q, i) => (
              <fieldset key={q.id} className="et-card p-5">
                <legend className="px-1 text-[11px] uppercase tracking-widest text-muted">{t("quizQuestion")} {i + 1}</legend>
                <p className="mb-3 font-medium">{q.prompt}</p>
                <div className="space-y-2">
                  {q.options.map((o, oi) => {
                    const on = answers[i] === oi;
                    return (
                      <label key={oi} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3"
                        style={on ? { borderColor: "var(--et-primary)", background: "var(--et-blue-bg)" } : { borderColor: "var(--et-line)" }}>
                        <input type="radio" name={`q-${i}`} checked={on} onChange={() => setAnswers((a) => ({ ...a, [i]: oi }))} className="size-4 accent-[var(--et-primary)]" />
                        <span className="text-sm">{o}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <button type="submit" disabled={busy || !allAnswered} className="et-btn w-full py-3.5 text-sm">
              {busy ? t("adding") : t("quizSubmit")}
            </button>
            {err && <p className="text-center text-sm text-danger">{err}</p>}
          </form>
        )}
    </>
  );
}
