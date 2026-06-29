export type SubjectGrade = { subject: string; seq1: number | null; seq2: number | null; avg: number | null };
type GradeRow = { sequence: number; score: number; subject: { name: string } };

export function avgOf(nums: (number | null)[]): number | null {
  const v = nums.filter((n): n is number => n !== null);
  if (v.length === 0) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
}

export function groupBySubject(grades: GradeRow[]): SubjectGrade[] {
  const map = new Map<string, { subject: string; seq1: number | null; seq2: number | null }>();
  for (const g of grades) {
    const entry = map.get(g.subject.name) ?? { subject: g.subject.name, seq1: null, seq2: null };
    if (g.sequence === 1) entry.seq1 = g.score;
    else if (g.sequence === 2) entry.seq2 = g.score;
    map.set(g.subject.name, entry);
  }
  return [...map.values()].map((s) => ({ ...s, avg: avgOf([s.seq1, s.seq2]) }));
}
