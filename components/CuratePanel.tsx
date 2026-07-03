"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { approveLibraryItem, rejectLibraryItem } from "@/app/curate/actions";

type Pending = {
  id: string;
  kind: "PAST_PAPER" | "SYLLABUS" | "STUDY_GUIDE";
  title: string;
  subject: string;
  exam: string | null;
  url: string | null;
  body: string | null;
  submitter: string;
  school: string;
  date: string;
};
export type CurateData = { pending: Pending[] };

function Row({ item }: { item: Pending }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function decide(kind: "approve" | "reject") {
    setBusy(kind);
    setErr(null);
    const res = kind === "approve" ? await approveLibraryItem(item.id) : await rejectLibraryItem(item.id);
    setBusy(null);
    if (res.ok) router.refresh();
    else setErr(res.error ?? "error");
  }

  return (
    <li className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display font-bold text-flint-black">{item.title}</div>
          <div className="font-mono text-[11px] text-muted">
            {[item.subject, item.exam, item.submitter, item.school, item.date].filter(Boolean).join(" · ")}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 font-mono text-[10px] uppercase text-muted">
          {item.kind === "PAST_PAPER" ? t("libPapers") : item.kind === "SYLLABUS" ? t("libSyllabi") : t("libGuides")}
        </span>
      </div>

      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-all font-mono text-xs text-flint-blue hover:underline">
          {item.url}
        </a>
      )}
      {item.body && <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap border-t border-black/5 pt-2 text-sm text-flint-black">{item.body}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => decide("approve")}
          className="min-h-10 flex-1 rounded-full bg-flint-blue font-mono text-xs uppercase tracking-widest text-white disabled:opacity-60"
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

export function CuratePanel({ data }: { data: CurateData }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/library" className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {t("libraryNav")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("curateTitle")}</h1>
          <p className="text-sm text-muted">{t("curateIntro")}</p>
        </div>
        <LanguageToggle />
      </header>

      {data.pending.length === 0 ? (
        <p className="rounded-2xl border border-success/20 bg-success/5 px-4 py-6 text-center text-success">{t("curateEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {data.pending.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}
