"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Megaphone, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";
import { reviewNationalNotice } from "@/app/noticeboard/actions";

export type Notice = { id: string; title: string; body: string; author: string; date: string };
export type NoticeboardData = {
  national: Notice[];
  pending: Notice[];
  isFlint: boolean;
  school: { name: string; posts: Notice[] } | null;
};

function NoticeCard({ n }: { n: Notice }) {
  return (
    <li className="et-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display font-bold text-ink">{n.title}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-sub">{n.body}</p>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{n.date}</span>
      </div>
      <div className="mt-2 font-mono text-[11px] text-muted">{n.author}</div>
    </li>
  );
}

// The public national board + (for signed-in viewers) their school board.
// Flint admins see the pending queue with the approval gate inline.
export function NoticeboardView({ data }: { data: NoticeboardData }) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function review(id: string, decision: "approve" | "reject") {
    setBusy(id);
    try {
      await reviewNationalNotice({ id, decision });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[720px] px-4 pb-16">
        {/* Top bar */}
        <div className="flex items-center gap-2 py-5">
          <a href="/" aria-label={t("navHome")} className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink">
            <ArrowLeft size={18} aria-hidden="true" />
          </a>
          <a href="/" className="flex items-center gap-2">
            <span className="text-ink"><OriginMark size={20} /></span>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">Flint Intelligence</span>
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
        <p className="mb-4 mt-1 text-sm text-muted">{t("nbIntro")}</p>

        <div className="et-anim flex flex-col gap-6">
          {/* Flint review queue */}
          {data.isFlint && data.pending.length > 0 && (
            <section>
              <h2 className="mb-2 font-mono text-xs uppercase tracking-widest" style={{ color: "var(--et-warn)" }}>
                {t("nbPendingSection")} · {data.pending.length}
              </h2>
              <ul className="space-y-2">
                {data.pending.map((n) => (
                  <li key={n.id} className="et-card p-4" style={{ background: "var(--et-warn-bg)", borderColor: "transparent" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-display font-bold text-ink">{n.title}</div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-sub">{n.body}</p>
                        <div className="mt-2 font-mono text-[11px] text-muted">{n.author} · {n.date}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={busy === n.id} onClick={() => review(n.id, "approve")}
                        className="et-btn flex-1 py-2.5 text-xs">
                        <CheckCircle2 size={15} aria-hidden="true" /> {t("nbApprove")}
                      </button>
                      <button type="button" disabled={busy === n.id} onClick={() => review(n.id, "reject")}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2.5 text-xs font-medium text-danger disabled:opacity-60">
                        <XCircle size={15} aria-hidden="true" /> {t("nbReject")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* National board */}
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted">
              <Megaphone size={13} aria-hidden="true" /> {t("natTag")}
            </h2>
            {data.national.length === 0 ? (
              <p className="et-card px-4 py-6 text-center text-muted">{t("nbEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {data.national.map((n) => <NoticeCard key={n.id} n={n} />)}
              </ul>
            )}
          </section>

          {/* School board — only for signed-in members of a school */}
          {data.school && data.school.posts.length > 0 && (
            <section>
              <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
                {t("nbSchoolSection")} · {data.school.name}
              </h2>
              <ul className="space-y-2">
                {data.school.posts.map((n) => <NoticeCard key={n.id} n={n} />)}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
