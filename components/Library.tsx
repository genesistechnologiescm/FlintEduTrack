"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";

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
export type LibraryData = { items: Item[] };

const KINDS = ["PAST_PAPER", "SYLLABUS", "STUDY_GUIDE"] as const;
const field = "min-h-11 rounded-lg border border-black/15 bg-white px-3 text-base";

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
          <a href="/student" className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {t("backStudent")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("libraryNav")}</h1>
          <p className="text-sm text-muted">{t("libIntro")}</p>
        </div>
        <LanguageToggle />
      </header>

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
              kind === k ? "bg-flint-blue text-white" : "border border-black/15 text-muted"
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

      {/* Shelf */}
      {groups.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-black/10 bg-white px-4 py-6 text-center text-muted">{t("libNone")}</p>
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map(([subj, items]) => (
            <section key={subj}>
              <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">{subj}</h2>
              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={i.id} className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-flint-black">{i.title}</div>
                        <div className="font-mono text-[11px] text-muted">
                          {[i.exam, i.year, i.paper ? `${t("libPaper")} ${i.paper}` : null].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      {i.url && (
                        <a
                          href={i.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 shrink-0 items-center font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline"
                        >
                          {t("resOpen")} →
                        </a>
                      )}
                    </div>
                    {i.body && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-flint-blue">
                          {t("libRead")}
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap border-t border-black/5 pt-2 text-sm text-flint-black">{i.body}</p>
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
