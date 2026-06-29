// Server-only: computes a student's fee balance for the current term.
// Billed = sum of fee items applicable to the student's class (or whole-school),
// in the current academic year's first term. Paid = sum of all their payments.
import { prisma } from "@/lib/prisma";

export type StudentBalance = {
  billed: number;
  paid: number;
  balance: number;
  schoolId: string | null;
  classGroupId: string | null;
  termId: string | null;
};

export async function getStudentBalance(studentId: string): Promise<StudentBalance> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, status: "ACTIVE" },
    orderBy: { enrolledAt: "desc" },
  });
  if (!enrollment) return { billed: 0, paid: 0, balance: 0, schoolId: null, classGroupId: null, termId: null };

  const year = await prisma.academicYear.findFirst({ where: { schoolId: enrollment.schoolId, isCurrent: true } });
  const term = year ? await prisma.term.findFirst({ where: { academicYearId: year.id }, orderBy: { order: "asc" } }) : null;

  let billed = 0;
  if (term) {
    const fees = await prisma.feeItem.findMany({
      where: {
        schoolId: enrollment.schoolId,
        termId: term.id,
        deletedAt: null,
        OR: [{ classGroupId: enrollment.classGroupId }, { classGroupId: null }],
      },
    });
    billed = fees.reduce((s, f) => s + f.amount, 0);
  }

  const agg = await prisma.payment.aggregate({ where: { studentId }, _sum: { amount: true } });
  const paid = agg._sum.amount ?? 0;

  return {
    billed,
    paid,
    balance: billed - paid,
    schoolId: enrollment.schoolId,
    classGroupId: enrollment.classGroupId,
    termId: term?.id ?? null,
  };
}
