// School performance index — a TRANSPARENT composite (0–100), never a black box:
//   attendance rate ×0.40 · data coverage ×0.25 · fee collection ×0.20 ·
//   risk-free share ×0.15
// Components a school has no data for are EXCLUDED and the weights renormalised
// (honest reweighting — a school without fee items isn't punished for it).
// Server-only (Prisma).
import { prisma } from "@/lib/prisma";

export type PerformanceBreakdown = {
  index: number;
  attendance: number | null; // %
  coverage: number | null; // % of recent school days with attendance data
  fees: number | null; // % collected of billed
  riskFree: number | null; // % of students NOT high-risk
};

const WEIGHTS = { attendance: 0.4, coverage: 0.25, fees: 0.2, riskFree: 0.15 } as const;

export async function computePerformance(
  inputs: { schoolId: string; attendanceRate: number | null; students: number; atRisk: number }[],
): Promise<Map<string, PerformanceBreakdown>> {
  const schoolIds = inputs.map((i) => i.schoolId);
  const since = new Date(Date.now() - 14 * 86_400_000);

  // Coverage: distinct attendance days in the last 14 vs ~12 school days (Mon–Sat).
  const days = await prisma.attendanceSession.findMany({
    where: { schoolId: { in: schoolIds }, date: { gte: since } },
    select: { schoolId: true, date: true },
    distinct: ["schoolId", "date"],
  });
  const dayCount = new Map<string, number>();
  for (const d of days) dayCount.set(d.schoolId, (dayCount.get(d.schoolId) ?? 0) + 1);
  const SCHOOL_DAYS = 12;

  // Fees: cash collected vs fees actually expected (billed minus waived), per
  // school. A waiver forgives fees, so it is neither cash collected nor expected
  // — excluding it both ways keeps a school that grants waivers from being scored
  // as if those students simply never paid.
  const [fees, enrollments, paySums, waiveSums] = await Promise.all([
    prisma.feeItem.findMany({ where: { schoolId: { in: schoolIds }, deletedAt: null } }),
    prisma.enrollment.findMany({
      where: { schoolId: { in: schoolIds }, status: "ACTIVE" },
      select: { schoolId: true, classGroupId: true },
    }),
    prisma.payment.groupBy({ by: ["schoolId"], where: { schoolId: { in: schoolIds }, method: { not: "WAIVER" } }, _sum: { amount: true } }),
    prisma.payment.groupBy({ by: ["schoolId"], where: { schoolId: { in: schoolIds }, method: "WAIVER" }, _sum: { amount: true } }),
  ]);
  const paidBySchool = new Map(paySums.map((p) => [p.schoolId, p._sum.amount ?? 0]));
  const waivedBySchool = new Map(waiveSums.map((p) => [p.schoolId, p._sum.amount ?? 0]));
  const billedBySchool = new Map<string, number>();
  for (const f of fees) {
    const applicable = enrollments.filter(
      (e) => e.schoolId === f.schoolId && (!f.classGroupId || e.classGroupId === f.classGroupId),
    ).length;
    billedBySchool.set(f.schoolId, (billedBySchool.get(f.schoolId) ?? 0) + f.amount * applicable);
  }

  const out = new Map<string, PerformanceBreakdown>();
  for (const s of inputs) {
    const attendance = s.attendanceRate;
    const coverage = dayCount.has(s.schoolId)
      ? Math.min(100, Math.round(((dayCount.get(s.schoolId) ?? 0) / SCHOOL_DAYS) * 100))
      : null;
    const billed = billedBySchool.get(s.schoolId) ?? 0;
    const expected = Math.max(0, billed - (waivedBySchool.get(s.schoolId) ?? 0));
    const fees = expected > 0 ? Math.min(100, Math.round(((paidBySchool.get(s.schoolId) ?? 0) / expected) * 100)) : null;
    const riskFree = s.students > 0 ? Math.round(((s.students - s.atRisk) / s.students) * 100) : null;

    const parts: [number | null, number][] = [
      [attendance, WEIGHTS.attendance],
      [coverage, WEIGHTS.coverage],
      [fees, WEIGHTS.fees],
      [riskFree, WEIGHTS.riskFree],
    ];
    const present = parts.filter((p): p is [number, number] => p[0] !== null);
    const totalW = present.reduce((n, [, w]) => n + w, 0);
    const index = totalW > 0 ? Math.round(present.reduce((n, [v, w]) => n + v * (w / totalW), 0)) : 0;

    out.set(s.schoolId, { index, attendance, coverage, fees, riskFree });
  }
  return out;
}
