"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { setWellbeing } from "@/app/wellbeing/actions";

type Level = "ENGAGED" | "NEUTRAL" | "NEEDS_ATTENTION" | null;
export type WellbeingData = {
  schoolName: string;
  isAdmin: boolean;
  weekStartISO: string;
  classes: { id: string; name: string }[];
  classGroupId: string;
  students: { studentId: string; name: string; level: Level }[];
};

const LEVELS: Exclude<Level, null>[] = ["ENGAGED", "NEUTRAL", "NEEDS_ATTENTION"];

function StudentRow({ studentId, name, initial }: { studentId: string; name: string; initial: Level }) {
  const { t } = useI18n();
  const [level, setLevel] = useState<Level>(initial);
  const [busy, setBusy] = useState(false);

  const label = (l: Exclude<Level, null>) =>
    l === "ENGAGED" ? t("wbEngaged") : l === "NEUTRAL" ? t("wbNeutral") : t("wbNeeds");
  const activeTone = (l: Exclude<Level, null>) =>
    l === "ENGAGED" ? "bg-success text-white" : l === "NEUTRAL" ? "bg-black/60 text-white" : "bg-error text-white";

  async function tap(l: Exclude<Level, null>) {
    const prev = level;
    setLevel(l); // optimistic
    setBusy(true);
    const res = await setWellbeing({ studentId, level: l });
    setBusy(false);
    if (!res.ok) setLevel(prev);
  }

  return (
    <li className="rounded-xl border border-black/10 bg-white p-3">
      <div className="mb-2 font-medium text-flint-black">{name}</div>
      <div className="flex gap-1.5" role="radiogroup" aria-label={name}>
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={level === l}
            disabled={busy}
            onClick={() => tap(l)}
            className={`min-h-10 flex-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-60 ${
              level === l ? activeTone(l) : "border border-black/15 text-muted"
            }`}
          >
            {label(l)}
          </button>
        ))}
      </div>
    </li>
  );
}

export function WellbeingBoard({ data }: { data: WellbeingData }) {
  const { t } = useI18n();
  const router = useRouter();
  const done = data.students.filter((s) => s.level !== null).length;

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a
            href={data.isAdmin ? "/admin" : "/attendance"}
            className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline"
          >
            ← {data.isAdmin ? t("backDash") : t("backAttendance")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("wellbeingNav")}</h1>
          <p className="text-sm text-muted">
            {t("wbWeekOf")} {data.weekStartISO} · {done}/{data.students.length}
          </p>
        </div>
        <LanguageToggle />
      </header>

      <p className="mb-4 text-sm text-muted">{t("wbIntro")}</p>

      {data.classes.length > 1 && (
        <select
          className="mb-4 min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base"
          value={data.classGroupId}
          onChange={(e) => router.push(`/wellbeing?class=${e.target.value}`)}
          aria-label={t("fldClass")}
        >
          {data.classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {data.students.length === 0 ? (
        <p className="rounded-2xl border border-black/10 bg-white px-4 py-6 text-center text-muted">{t("noStudents")}</p>
      ) : (
        <ul className="space-y-2">
          {data.students.map((s) => (
            <StudentRow key={s.studentId} studentId={s.studentId} name={s.name} initial={s.level} />
          ))}
        </ul>
      )}
    </main>
  );
}
