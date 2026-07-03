// Gate check-in conventions. Cameroon runs on WAT (UTC+1, no DST); the school
// day starts at 07:30 — arrivals at or before that are "on time". Kept pure and
// client-safe so both the action and the UIs share one definition.

export const SCHOOL_START = { hour: 7, minute: 30 } as const;
const WAT_OFFSET_HOURS = 1;

export function watTimeParts(d: Date): { hour: number; minute: number } {
  return { hour: (d.getUTCHours() + WAT_OFFSET_HOURS) % 24, minute: d.getUTCMinutes() };
}

export function formatWat(d: Date): string {
  const { hour, minute } = watTimeParts(d);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function isOnTime(arrivedAt: Date): boolean {
  const { hour, minute } = watTimeParts(arrivedAt);
  return hour < SCHOOL_START.hour || (hour === SCHOOL_START.hour && minute <= SCHOOL_START.minute);
}

// Today's date in WAT (not UTC — a 23:30 UTC check-in belongs to the next school day).
export function watTodayISO(now = new Date()): string {
  const shifted = new Date(now.getTime() + WAT_OFFSET_HOURS * 3600_000);
  return shifted.toISOString().slice(0, 10);
}
