"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
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
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl p-4" style={{ background: "var(--et-blue-bg)" }}>
      <div className="flex min-w-0 items-center gap-2.5">
        <WifiOff size={18} className="shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <div className="font-medium">{t("offlineSaveTitle")}</div>
          <div className="font-mono text-[11px] text-muted">
            {savedAt ? `${count} · ${t("offlineSavedOn")} ${savedAt.slice(0, 10)}` : t("offlineHint")}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {savedAt && (
          <a href="/offline-lessons" className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
            {t("offlineOpen")}
          </a>
        )}
        <button type="button" onClick={save} disabled={busy} className="et-btn px-4 py-2 text-xs">
          {busy ? t("adding") : savedAt ? t("offlineUpdate") : t("offlineSaveBtn")}
        </button>
      </div>
    </div>
  );
}
