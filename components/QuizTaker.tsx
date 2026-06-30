"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
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
    <main className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/student" className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {t("backStudent")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{title}</h1>
        </div>
        <LanguageToggle />
      </header>

      {done || result ? (
        <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">{t("quizYourScore")}</div>
          <div className="mt-1 font-display text-5xl font-bold tabular-nums text-success">
            {result ? result.score : alreadyScore}%
          </div>
          {result && <div className="mt-1 font-mono text-xs text-muted">{result.correct}/{result.total} {t("quizCorrectCount")}</div>}
          <button onClick={() => router.push("/student")} className="mt-4 min-h-11 rounded-full bg-flint-blue px-6 font-mono text-sm font-medium text-white">
            {t("backStudent")}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {questions.map((q, i) => (
            <fieldset key={q.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <legend className="px-1 font-mono text-[11px] uppercase tracking-widest text-muted">{t("quizQuestion")} {i + 1}</legend>
              <p className="mb-3 font-medium text-flint-black">{q.prompt}</p>
              <div className="space-y-2">
                {q.options.map((o, oi) => (
                  <label key={oi} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 ${answers[i] === oi ? "border-flint-blue bg-flint-blue/5" : "border-black/10"}`}>
                    <input type="radio" name={`q-${i}`} checked={answers[i] === oi} onChange={() => setAnswers((a) => ({ ...a, [i]: oi }))} className="size-4 accent-flint-blue" />
                    <span className="text-sm text-flint-black">{o}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button type="submit" disabled={busy || !allAnswered} className="min-h-12 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60">
            {busy ? t("adding") : t("quizSubmit")}
          </button>
          {err && <p className="text-center text-sm text-error">{err}</p>}
        </form>
      )}
    </main>
  );
}
