"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { approveCorrection, rejectCorrection } from "@/app/admin/corrections/actions";

type Correction = {
  id: string;
  student: string;
  subject: string;
  sequence: number;
  oldScore: number;
  newScore: number;
  requester: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};
export type CorrectionsData = {
  schoolName: string;
  pending: Correction[];
  decided: Correction[];
};

function ScoreChange({ oldScore, newScore }: { oldScore: number; newScore: number }) {
  return (
    <span className="font-mono tabular-nums">
      <span className="text-muted line-through">{oldScore}</span>
      <span className="mx-1.5 text-muted">→</span>
      <span className="font-bold text-ink">{newScore}</span>
      <span className="text-muted"> /20</span>
    </span>
  );
}

function PendingRow({ c }: { c: Correction }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function decide(kind: "approve" | "reject") {
    setBusy(kind);
    setErr(null);
    const res = kind === "approve" ? await approveCorrection(c.id) : await rejectCorrection(c.id);
    setBusy(null);
    if (res.ok) router.refresh();
    else setErr(res.error ?? "error");
  }

  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display font-bold text-ink">{c.student}</div>
          <div className="font-mono text-xs text-muted">
            {c.subject} · {t("seqWord")} {c.sequence} · {c.requester} · {c.date}
          </div>
        </div>
        <ScoreChange oldScore={c.oldScore} newScore={c.newScore} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => decide("approve")}
          className="min-h-10 flex-1 rounded-full bg-primary font-mono text-xs uppercase tracking-widest text-white disabled:opacity-60"
        >
          {busy === "approve" ? t("adding") : t("approveBtn")}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => decide("reject")}
          className="min-h-10 flex-1 rounded-full border border-error/30 font-mono text-xs uppercase tracking-widest text-error disabled:opacity-60"
        >
          {busy === "reject" ? t("adding") : t("rejectBtn")}
        </button>
      </div>
      {err && <p className="mt-2 text-center text-xs text-error">{err}</p>}
    </li>
  );
}

export function CorrectionsPanel({ data }: { data: CorrectionsData }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("correctionsNav")}</h1>
          <p className="text-muted">{data.schoolName}</p>
        </div>
        <LanguageToggle />
      </header>

      <p className="mb-4 text-sm text-muted">{t("corrIntro")}</p>

      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
        {t("corrPendingTitle")} · {data.pending.length}
      </h2>
      {data.pending.length === 0 ? (
        <p className="rounded-2xl border border-success/20 bg-success/5 px-4 py-6 text-center text-success">{t("corrNonePending")}</p>
      ) : (
        <ul className="space-y-2">
          {data.pending.map((c) => (
            <PendingRow key={c.id} c={c} />
          ))}
        </ul>
      )}

      {data.decided.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("corrDecidedTitle")}</h2>
          <ul className="space-y-1">
            {data.decided.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2 text-sm">
                <span className="min-w-0 truncate text-ink">
                  {c.student} · <span className="text-muted">{c.subject}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <ScoreChange oldScore={c.oldScore} newScore={c.newScore} />
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                      c.status === "APPROVED" ? "bg-success/15 text-success" : "bg-error/10 text-error"
                    }`}
                  >
                    {c.status === "APPROVED" ? t("corrApproved") : t("corrRejected")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
