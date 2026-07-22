// Timetable shape, shared by the admin grid (client) and its actions (server).
// Cameroon secondary schools run 55-minute periods with a mid-morning break and
// a lunch break — the ladder below matches the seeded demo school.

export type Period = { start: string; end: string };

export const PERIODS: Period[] = [
  { start: "07:30", end: "08:25" },
  { start: "08:25", end: "09:20" },
  { start: "09:20", end: "10:15" },
  { start: "10:30", end: "11:25" },
  { start: "11:25", end: "12:20" },
  { start: "12:20", end: "13:15" },
  { start: "14:00", end: "14:55" },
  { start: "14:55", end: "15:50" },
];

// Breaks are drawn after these period indexes (display only — never stored).
export const BREAK_AFTER = new Map<number, string>([
  [2, "Break"],
  [5, "Lunch"],
]);

// dayOfWeek is stored 1..6 (Mon..Sat) — Sunday is not a school day.
export const DAYS = [
  { value: 1, en: "Monday", fr: "Lundi", shortEn: "Mon", shortFr: "Lun" },
  { value: 2, en: "Tuesday", fr: "Mardi", shortEn: "Tue", shortFr: "Mar" },
  { value: 3, en: "Wednesday", fr: "Mercredi", shortEn: "Wed", shortFr: "Mer" },
  { value: 4, en: "Thursday", fr: "Jeudi", shortEn: "Thu", shortFr: "Jeu" },
  { value: 5, en: "Friday", fr: "Vendredi", shortEn: "Fri", shortFr: "Ven" },
  { value: 6, en: "Saturday", fr: "Samedi", shortEn: "Sat", shortFr: "Sam" },
];

export function periodEndFor(start: string): string {
  return PERIODS.find((p) => p.start === start)?.end ?? start;
}

export function isKnownPeriodStart(start: string): boolean {
  return PERIODS.some((p) => p.start === start);
}
