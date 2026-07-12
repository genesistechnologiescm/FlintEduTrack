"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";
import { postNationalNotice, removeNationalNotice } from "@/app/government/noticeboard/actions";

type NoticeRow = {
  id: string;
  title: string;
  body: string;
  status: "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";
  author: string;
  date: string;
  mine: boolean;
};
export type NationalNoticeboardData = { notices: NoticeRow[]; isFlint: boolean };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

// Ministry-side manager: post national notices (reviewed by Flint before the
// country sees them) and remove own ones with a stated reason. Standalone
// page chrome, mirroring the exam-calendar manager.
export function NationalNoticeboardManager({ data }: { data: NationalNoticeboardData }) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const statusChip = (s: NoticeRow["status"]) => {
    if (s === "PUBLISHED") return { label: t("nbStPublished"), bg: "var(--et-ok-bg)", fg: "var(--et-ok)" };
    if (s === "PENDING_REVIEW") return { label: t("nbStPending"), bg: "var(--et-warn-bg)", fg: "var(--et-warn)" };
    return { label: t("nbStRejected"), bg: "var(--et-danger-bg)", fg: "var(--et-danger)" };
  };

  async function onPost(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await postNationalNotice({ title, body });
      if (res.ok) {
        setTitle("");
        setBody("");
        router.refresh();
      } else setErr(res.error ?? "error");
    } catch {
      setErr("error");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    if (reason.trim().length < 3) return;
    await removeNationalNotice({ id, reason: reason.trim() });
    setRemoving(null);
    setReason("");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[640px] px-4 pb-16">
        {/* Top bar */}
        <div className="flex items-center gap-2 py-5">
          <a href="/government" aria-label={t("govCalBack")} className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink">
            <ArrowLeft size={18} aria-hidden="true" />
          </a>
          <a href="/government" className="flex items-center gap-2">
            <span className="text-ink"><OriginMark size={20} /></span>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">{t("govBadge")}</span>
          </a>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="flex overflow-hidden rounded-full border border-line text-xs">
              {(["en", "fr"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLocale(l)} aria-pressed={locale === l}
                  className={`px-2.5 py-1.5 ${locale === l ? "bg-primary text-white" : "text-muted"}`}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">{t("nbTitle")}</h1>
        <p className="mb-4 mt-1 text-sm text-muted">{t("nbPostNote")}</p>

        {/* Post form */}
        <section className="et-card p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("nbPost")}</h2>
          <form onSubmit={onPost} className="space-y-3">
            <input className={field} placeholder={t("fldTitle")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            <textarea className={`${field} min-h-28 py-2.5`} placeholder={t("nbBody")} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} required />
            <button type="submit" disabled={busy} className="et-btn min-h-11 w-full text-sm">
              {busy ? t("adding") : t("nbPost")}
            </button>
            {err && <p className="text-center text-sm text-danger">{err}</p>}
          </form>
        </section>

        {/* All national notices with status */}
        <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">
          {t("announcementsNav")} · {data.notices.length}
        </h2>
        {data.notices.length === 0 ? (
          <p className="et-card px-4 py-5 text-center text-muted">{t("nbEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {data.notices.map((n) => {
              const chip = statusChip(n.status);
              return (
                <li key={n.id} className="et-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display font-bold text-ink">{n.title}</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-sub">{n.body}</p>
                      <div className="mt-2 font-mono text-[11px] text-muted">{n.author} · {n.date}</div>
                    </div>
                    <span className="et-pill shrink-0" style={{ background: chip.bg, color: chip.fg }}>{chip.label}</span>
                  </div>
                  {(n.mine || data.isFlint) && (
                    removing === n.id ? (
                      <div className="mt-3 flex gap-2">
                        <input
                          className={`${field} flex-1`}
                          placeholder={t("nbRemoveReason")}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          maxLength={300}
                        />
                        <button type="button" disabled={reason.trim().length < 3} onClick={() => onRemove(n.id)}
                          className="shrink-0 rounded-lg border border-line px-3 font-mono text-[11px] uppercase tracking-widest text-danger disabled:opacity-50">
                          {t("nbConfirmRemove")}
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setRemoving(n.id); setReason(""); }}
                        className="mt-2 font-mono text-[11px] uppercase tracking-widest text-danger hover:underline">
                        {t("nbRemove")}
                      </button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
