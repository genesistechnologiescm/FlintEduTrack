"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { LogoutButton } from "./LogoutButton";
import { submitAttendance, type SubmitResult } from "@/app/attendance/actions";
import { enqueue } from "@/lib/offline/queue";

type Student = { id: string; firstName: string; lastName: string };

export function AttendanceMarker({
  slotId,
  dateISO,
  className,
  subjectName,
  periodLabel,
  students,
}: {
  slotId: string;
  dateISO: string;
  className: string;
  subjectName: string;
  periodLabel: string;
  students: Student[];
}) {
  const { t } = useI18n();
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "queued">("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);

  const toggle = (id: string) =>
    setAbsent((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  async function onSubmit() {
    setStatus("submitting");
    try {
      const res = await submitAttendance({
        slotId,
        dateISO,
        absentStudentIds: [...absent],
      });
      setResult(res);
      setStatus("done");
    } catch {
      // No connection (or server unreachable) — save locally and sync later.
      await enqueue({ slotId, dateISO, absentStudentIds: [...absent] });
      setStatus("queued");
    }
  }

  const presentCount = students.length - absent.size;

  if (status === "done" && result) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-[480px] place-items-center px-6">
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/15">
            <span className="size-3 rounded-full bg-success" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">{t("submittedTitle")}</h1>
          <p className="mt-2 text-muted">
            {t("submittedBody")
              .replace("%n", String(result.absent))
              .replace("%t", String(result.total))}
          </p>
          <a
            href="/attendance"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-flint-blue px-6 font-mono text-sm font-medium text-white"
          >
            {t("done")}
          </a>
        </div>
      </div>
    );
  }

  if (status === "queued") {
    return (
      <div className="mx-auto grid min-h-dvh max-w-[480px] place-items-center px-6">
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-500/15">
            <span className="size-3 rounded-full bg-amber-500" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">{t("queuedTitle")}</h1>
          <p className="mt-2 text-muted">{t("queuedBody")}</p>
          <a
            href="/attendance"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-flint-blue px-6 font-mono text-sm font-medium text-white"
          >
            {t("done")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[480px] px-4 pb-28 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <LanguageToggle />
        <LogoutButton />
      </div>

      {/* Header */}
      <header className="mb-4">
        <span className="font-mono text-xs uppercase tracking-widest text-flint-blue">
          {t("demoBadge")}
        </span>
        <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">
          {className}
        </h1>
        <p className="text-muted">
          {subjectName} · {periodLabel} · {t("todayLabel")}
        </p>
        <a
          href="/grades"
          className="mt-2 inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline"
        >
          {t("gradesNav")} →
        </a>
        <p className="mt-3 rounded-lg bg-black/5 px-3 py-2 text-sm text-muted">
          {t("tapHint")}
        </p>
      </header>

      {/* Roster */}
      <ul className="space-y-2">
        {students.map((s, i) => {
          const isAbsent = absent.has(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={isAbsent}
                className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-left transition-colors ${
                  isAbsent
                    ? "border-error/30 bg-error/10"
                    : "border-black/10 bg-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium text-flint-black">
                    {s.lastName} {s.firstName}
                  </span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-xs ${
                    isAbsent ? "bg-error text-white" : "bg-success/15 text-success"
                  }`}
                >
                  {isAbsent ? t("absent") : t("present")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Sticky submit bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-black/10 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-[480px] items-center justify-between gap-4">
          <span className="font-mono text-sm text-muted">
            {presentCount} {t("presentWord")} · {absent.size} {t("absentWord")}
          </span>
          <button
            type="button"
            onClick={onSubmit}
            disabled={status === "submitting"}
            className="inline-flex min-h-12 items-center rounded-full bg-flint-blue px-6 font-mono text-sm font-medium text-white transition-opacity disabled:opacity-60"
          >
            {status === "submitting" ? t("submitting") : t("submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
