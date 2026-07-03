// Wellbeing-week convention: snapshots key on the Monday of the current ISO
// week in Cameroon time (WAT, UTC+1) — consistent with lib/gate.ts.

const WAT_OFFSET_MS = 3600_000;

export function wellbeingWeekStartISO(now = new Date()): string {
  const wat = new Date(now.getTime() + WAT_OFFSET_MS);
  const day = wat.getUTCDay(); // 0=Sun..6=Sat
  const sinceMonday = (day + 6) % 7;
  wat.setUTCDate(wat.getUTCDate() - sinceMonday);
  return wat.toISOString().slice(0, 10);
}

export type WellbeingLevelT = "ENGAGED" | "NEUTRAL" | "NEEDS_ATTENTION";
export const WELLBEING_LEVELS: WellbeingLevelT[] = ["ENGAGED", "NEUTRAL", "NEEDS_ATTENTION"];
