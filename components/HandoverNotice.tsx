"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";

type Note = { body: string; until: string; author: string };

// Shown to whoever opens the class — the substitute's briefing.
export function HandoverNotice({ notes }: { notes: Note[] }) {
  const { t } = useI18n();
  if (notes.length === 0) return null;
  return (
    <div className="mx-auto mb-4 max-w-[560px] space-y-2">
      {notes.map((n, i) => (
        <div key={i} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="font-mono text-[11px] uppercase tracking-widest text-amber-800">
            {t("handoverNav")} · {t("hoFrom")} {n.author} · {t("hoUntilShort")} {n.until}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-flint-black">{n.body}</p>
        </div>
      ))}
    </div>
  );
}
