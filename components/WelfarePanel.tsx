"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { logWelfareAction } from "@/app/admin/welfare/actions";

type EventType = "NOTE" | "MEETING_SCHEDULED" | "HOME_VISIT" | "OUTCOME_LOGGED" | "STAFF_ASSIGNED";
type Stage = "CONCERN" | "MEETING" | "AT_RISK";

export type AtRiskRow = {
  studentId: string;
  name: string;
  absences: number;
  stage: Stage;
  events: { type: EventType; description: string; when: string }[];
};

const EVENT_TYPES: EventType[] = ["NOTE", "MEETING_SCHEDULED", "HOME_VISIT", "OUTCOME_LOGGED", "STAFF_ASSIGNED"];

function StageBadge({ stage }: { stage: Stage }) {
  const { t } = useI18n();
  const map = {
    CONCERN: { label: t("stageConcern"), cls: "bg-blue-bg text-primary" },
    MEETING: { label: t("stageMeeting"), cls: "bg-warn-bg text-warn" },
    AT_RISK: { label: t("stageAtRisk"), cls: "bg-error/10 text-error" },
  }[stage];
  return <span className={`rounded-full px-3 py-1 font-mono text-xs ${map.cls}`}>{map.label}</span>;
}

function StudentCard({ row }: { row: AtRiskRow }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EventType>("NOTE");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const evtLabel: Record<EventType, string> = {
    NOTE: t("evtNOTE"),
    MEETING_SCHEDULED: t("evtMEETING_SCHEDULED"),
    HOME_VISIT: t("evtHOME_VISIT"),
    OUTCOME_LOGGED: t("evtOUTCOME_LOGGED"),
    STAFF_ASSIGNED: t("evtSTAFF_ASSIGNED"),
  };

  async function save() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await logWelfareAction({ studentId: row.studentId, type, note: note.trim() });
      setNote("");
      router.refresh();
      setOpen(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{row.name}</span>
          <span className="font-mono text-xs text-muted">
            {row.absences} {t("unexcusedAbsences")}
          </span>
        </span>
        <StageBadge stage={row.stage} />
      </button>

      {open && (
        <div className="border-t border-line px-4 py-4">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
            {t("caseTimeline")}
          </h3>
          {row.events.length === 0 ? (
            <p className="text-sm text-muted">{t("noEvents")}</p>
          ) : (
            <ul className="space-y-2">
              {row.events.map((e, i) => (
                <li key={i} className="rounded-lg bg-chip px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-primary">{evtLabel[e.type]}</span>
                  <span className="ml-2 text-xs text-muted">{e.when}</span>
                  <p className="mt-1 text-ink">{e.description}</p>
                </li>
              ))}
            </ul>
          )}

          {/* Log a human action */}
          <div className="mt-4 space-y-2">
            <label className="block font-mono text-xs uppercase tracking-widest text-muted">
              {t("logAction")}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm"
            >
              {EVENT_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {evtLabel[tp]}
                </option>
              ))}
            </select>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("actionNoteLabel")}
              rows={2}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !note.trim()}
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-mono text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function WelfarePanel({ rows, wellbeingFlags = [] }: { rows: AtRiskRow[]; wellbeingFlags?: string[] }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs text-primary hover:underline">
            {t("backDashboard")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">
            {t("welfareTitle")}
          </h1>
        </div>
        <LanguageToggle />
      </header>

      <p className="mb-5 rounded-lg bg-blue-bg px-3 py-2 text-sm text-muted">
        {t("welfareIntro")}
      </p>

      {/* Teachers' wellbeing reads this week — the human signal */}
      {wellbeingFlags.length > 0 && (
        <section className="mb-5 rounded-2xl border border-error/20 bg-error/5 p-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-error">
            {t("wbFlagsTitle")} · {wellbeingFlags.length}
          </h2>
          <p className="mt-1 text-sm text-ink">{wellbeingFlags.join(" · ")}</p>
          <a
            href="/wellbeing"
            className="mt-2 inline-flex min-h-9 items-center font-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
          >
            {t("wellbeingNav")} →
          </a>
        </section>
      )}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-muted">
          {t("noAtRisk")}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <StudentCard key={r.studentId} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
