"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";

type Lesson = { id: string; title: string; type: "LINK" | "NOTE"; url: string | null; body: string | null };
type Group = { subject: string; items: Lesson[] };

const KEY = "edutrack.offline.lessons";

// "Download lessons" (Phase-3 continuity): saves the student's lessons to the
// device and warms the service-worker cache for /offline-lessons, so they can
// study at home with no data at all.
export function OfflineLessons({ lessons, studentName }: { lessons: Group[]; studentName: string }) {
  const { t, locale } = useI18n();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSavedAt((JSON.parse(raw).savedAt as string) ?? null);
    } catch {
      // unreadable — treat as not saved
    }
  }, []);

  const count = lessons.reduce((n, g) => n + g.items.length, 0);
  if (count === 0) return null;

  async function save() {
    setBusy(true);
    const stamp = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify({ savedAt: stamp, locale, studentName, lessons }));
      setSavedAt(stamp);
      // Warm the SW cache so the offline page + renderer survive with no network.
      await Promise.allSettled([fetch("/offline-lessons"), fetch("/offline-lessons.js")]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-flint-blue/20 bg-flint-blue/5 px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium text-flint-black">{t("offlineSaveTitle")}</div>
        <div className="font-mono text-[11px] text-muted">
          {savedAt ? `${count} · ${t("offlineSavedOn")} ${savedAt.slice(0, 10)}` : t("offlineHint")}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {savedAt && (
          <a href="/offline-lessons" className="font-mono text-[11px] uppercase tracking-widest text-flint-blue hover:underline">
            {t("offlineOpen")}
          </a>
        )}
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="min-h-10 rounded-full bg-flint-blue px-4 font-mono text-xs uppercase tracking-widest text-white disabled:opacity-60"
        >
          {busy ? t("adding") : savedAt ? t("offlineUpdate") : t("offlineSaveBtn")}
        </button>
      </div>
    </div>
  );
}
