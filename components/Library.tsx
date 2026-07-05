"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { submitLibraryItem } from "@/app/library/actions";

type Item = {
  id: string;
  kind: "PAST_PAPER" | "SYLLABUS" | "STUDY_GUIDE";
  title: string;
  subject: string;
  exam: string | null;
  year: number | null;
  paper: number | null;
  url: string | null;
  body: string | null;
};
export type LibraryData = {
  items: Item[];
  canContribute: boolean;
  isCurator: boolean;
  pendingCount: number;
  mySubmissions: { title: string; status: "PENDING" | "REJECTED" }[];
};

const KINDS = ["PAST_PAPER", "SYLLABUS", "STUDY_GUIDE"] as const;
const field = "min-h-11 rounded-lg border border-line bg-surface px-3 text-base";

// Staff-only: submit a contribution to the national shelf (curated before it appears).
function ContributeCard({ mySubmissions }: { mySubmissions: LibraryData["mySubmissions"] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("STUDY_GUIDE");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await submitLibraryItem({
        kind,
        title,
        subject,
        url: url.trim() || undefined,
        body: body.trim() || undefined,
      });
      if (res.ok) {
        setMsg(t("libSubmitted"));
        setTitle("");
        setSubject("");
        setUrl("");
        setBody("");
        router.refresh();
      } else setErr(res.error ?? "error");
    } catch {
      setErr(t("libSubmitFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-flint-blue/20 bg-blue-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-ink">{t("libContribute")}</div>
          <div className="font-mono text-[11px] text-muted">{t("libContributeHint")}</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-h-10 shrink-0 rounded-full border border-flint-blue/30 px-4 font-mono text-xs uppercase tracking-widest text-primary"
        >
          {open ? t("cancel") : t("libContributeBtn")}
        </button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-3 space-y-2 border-t border-flint-blue/10 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <select className={field} value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}>
              <option value="STUDY_GUIDE">{t("libGuides")}</option>
              <option value="PAST_PAPER">{t("libPapers")}</option>
              <option value="SYLLABUS">{t("libSyllabi")}</option>
            </select>
            <input className={field} placeholder={t("fldSubject")} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} required />
          </div>
          <input className={`${field} w-full`} placeholder={t("fldTitle")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required />
          <input className={`${field} w-full`} type="url" inputMode="url" placeholder={t("libLinkOptional")} value={url} onChange={(e) => setUrl(e.target.value)} />
          <textarea
            className="min-h-24 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base"
            placeholder={t("libBodyOptional")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={8000}
          />
          <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
            {busy ? t("adding") : t("libSubmitBtn")}
          </button>
          {msg && <p className="text-center text-sm text-success">{msg}</p>}
          {err && <p className="text-center text-sm text-error">{err}</p>}
        </form>
      )}

      {mySubmissions.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-flint-blue/10 pt-3">
          {mySubmissions.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink">{s.title}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${
                  s.status === "PENDING" ? "bg-warn-bg text-warn" : "bg-error/10 text-error"
                }`}
              >
                {s.status === "PENDING" ? t("libPending") : t("corrRejected")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Library({ data }: { data: LibraryData }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("PAST_PAPER");
  const [subject, setSubject] = useState("");
  const [q, setQ] = useState("");

  const subjects = useMemo(
    () => [...new Set(data.items.map((i) => i.subject))].sort(),
    [data.items],
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.items.filter(
      (i) =>
        i.kind === kind &&
        (!subject || i.subject === subject) &&
        (!needle || `${i.title} ${i.subject} ${i.exam ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [data.items, kind, subject, q]);

  // Group by subject for a shelf-like reading order.
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of shown) {
      const list = m.get(i.subject) ?? [];
      list.push(i);
      m.set(i.subject, list);
    }
    return [...m.entries()];
  }, [shown]);

  const kindLabel = (k: (typeof KINDS)[number]) =>
    k === "PAST_PAPER" ? t("libPapers") : k === "SYLLABUS" ? t("libSyllabi") : t("libGuides");

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/student" className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {t("backStudent")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("libraryNav")}</h1>
          <p className="text-sm text-muted">{t("libIntro")}</p>
        </div>
        <LanguageToggle />
      </header>

      {data.isCurator && data.pendingCount > 0 && (
        <a
          href="/curate"
          className="mb-4 flex min-h-11 items-center justify-between rounded-2xl border border-amber-500/30 bg-warn-bg px-4 py-3"
        >
          <span className="font-medium text-warn">
            {t("libReviewQueue")} · {data.pendingCount}
          </span>
          <span className="font-mono text-xs text-warn">→</span>
        </a>
      )}

      {/* Kind tabs */}
      <div className="flex gap-2" role="tablist">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-10 flex-1 rounded-full font-mono text-[11px] uppercase tracking-widest ${
              kind === k ? "bg-primary text-white" : "border border-line text-muted"
            }`}
          >
            {kindLabel(k)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select className={field} value={subject} onChange={(e) => setSubject(e.target.value)} aria-label={t("fldSubject")}>
          <option value="">{t("libAllSubjects")}</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          className={field}
          type="search"
          placeholder={t("libSearch")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {data.canContribute && <ContributeCard mySubmissions={data.mySubmissions} />}

      {/* Shelf */}
      {groups.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-surface px-4 py-6 text-center text-muted">{t("libNone")}</p>
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map(([subj, items]) => (
            <section key={subj}>
              <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">{subj}</h2>
              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={i.id} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-ink">{i.title}</div>
                        <div className="font-mono text-[11px] text-muted">
                          {[i.exam, i.year, i.paper ? `${t("libPaper")} ${i.paper}` : null].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      {i.url && (
                        <a
                          href={i.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 shrink-0 items-center font-mono text-xs uppercase tracking-widest text-primary hover:underline"
                        >
                          {t("resOpen")} →
                        </a>
                      )}
                    </div>
                    {i.body && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-primary">
                          {t("libRead")}
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap border-t border-line pt-2 text-sm text-ink">{i.body}</p>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
