// Dropout-risk scoring — a transparent, explainable heuristic over a student's
// recent attendance (NOT a black-box model). It surfaces children trending toward
// dropping out so a human can intervene early; the welfare pipeline stays
// human-driven. Pure + client-safe (no DB), so bands/labels render anywhere.

export type RiskBand = "high" | "watch" | "low";
export type RiskResult = {
  score: number; // 0–100
  band: RiskBand;
  reasons: string[];
  absencesRecent: number;
  windowSize: number;
  streak: number;
};

const HIGH = 60;
const WATCH = 30;

// records: any order of { date: ISO, absent }. We look at the most recent ~20 marks.
export function dropoutRisk(records: { date: string; absent: boolean }[]): RiskResult {
  if (records.length === 0) {
    return { score: 0, band: "low", reasons: ["No attendance recorded yet"], absencesRecent: 0, windowSize: 0, streak: 0 };
  }
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1)); // most recent first
  const recent = sorted.slice(0, 20);
  const absencesRecent = recent.filter((r) => r.absent).length;
  const recentRate = absencesRecent / recent.length; // 0..1

  let streak = 0;
  for (const r of sorted) {
    if (r.absent) streak++;
    else break;
  }

  const last10 = sorted.slice(0, 10);
  const prior10 = sorted.slice(10, 20);
  const rateLast = last10.length ? last10.filter((r) => r.absent).length / last10.length : 0;
  const ratePrior = prior10.length ? prior10.filter((r) => r.absent).length / prior10.length : 0;
  const rising = prior10.length >= 5 && rateLast > ratePrior + 0.15;

  // Weighted: recent absence rate dominates; a live streak and a worsening trend add on top.
  let score = Math.round(recentRate * 70 + (Math.min(streak, 5) / 5) * 20 + (rising ? 10 : 0));
  score = Math.max(0, Math.min(100, score));

  const band: RiskBand = score >= HIGH ? "high" : score >= WATCH ? "watch" : "low";

  const reasons: string[] = [];
  if (streak >= 2) reasons.push(`Absent ${streak} school days in a row`);
  if (absencesRecent > 0) reasons.push(`${absencesRecent} of last ${recent.length} days missed`);
  if (rising) reasons.push("Attendance is falling");
  if (reasons.length === 0) reasons.push("Attending regularly");

  return { score, band, reasons, absencesRecent, windowSize: recent.length, streak };
}
