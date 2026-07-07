"use client";

import { useCallback, useEffect, useState } from "react";
import {
  countPending,
  getAllPending,
  onQueueChange,
  removePending,
} from "@/lib/offline/queue";
import { submitAttendance } from "@/app/attendance/actions";
import { useI18n } from "@/lib/i18n/LanguageProvider";

// App-wide banner: shows queued attendance and flushes it to the server on
// reconnect. SMS only ever fires server-side, so until a write syncs, parents
// are explicitly "not yet notified".
export function SyncBanner() {
  const { t } = useI18n();
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setCount(await countPending().catch(() => 0));
  }, []);

  const flush = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setSyncing(true);
    try {
      const pending = await getAllPending();
      for (const w of pending) {
        try {
          await submitAttendance({
            slotId: w.slotId,
            dateISO: w.dateISO,
            absentStudentIds: w.absentStudentIds,
          });
          await removePending(w.id);
        } catch {
          // still offline / failing — keep it queued for the next attempt
        }
      }
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
    void flush();
    const unsub = onQueueChange(refresh);
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
    };
  }, [refresh, flush]);

  if (count === 0) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center font-mono text-xs text-ink"
    >
      <span>
        {count} {t("pendingSync")} · {t("notNotified")}
      </span>
      <button type="button" onClick={() => void flush()} disabled={syncing} className="underline disabled:opacity-60">
        {syncing ? t("syncing") : t("syncNow")}
      </button>
    </div>
  );
}
