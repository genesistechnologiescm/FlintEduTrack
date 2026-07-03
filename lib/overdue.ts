// School-wide overdue computation (server-only): a student is overdue when the
// fees applicable to them with a due date in the past exceed what they've paid.
// Set-wise (three queries), not per-student loops.
import { prisma } from "@/lib/prisma";

export type OverdueRow = {
  studentId: string;
  name: string;
  className: string;
  overdueAmount: number;
  daysOverdue: number;
};

export async function computeOverdue(schoolId: string): Promise<OverdueRow[]> {
  const today = new Date(new Date().toISOString().slice(0, 10));

  const dueFees = await prisma.feeItem.findMany({
    where: { schoolId, deletedAt: null, dueDate: { not: null, lt: today } },
  });
  if (dueFees.length === 0) return [];

  const [enrollments, payments] = await Promise.all([
    prisma.enrollment.findMany({
      where: { schoolId, status: "ACTIVE" },
      include: { student: { select: { firstName: true, lastName: true } }, classGroup: { select: { name: true } } },
    }),
    prisma.payment.groupBy({ by: ["studentId"], where: { schoolId }, _sum: { amount: true } }),
  ]);
  const paidByStudent = new Map(payments.map((p) => [p.studentId, p._sum.amount ?? 0]));

  const rows: OverdueRow[] = [];
  for (const e of enrollments) {
    const applicable = dueFees.filter((f) => !f.classGroupId || f.classGroupId === e.classGroupId);
    if (applicable.length === 0) continue;
    const billedDue = applicable.reduce((s, f) => s + f.amount, 0);
    const overdueAmount = billedDue - (paidByStudent.get(e.studentId) ?? 0);
    if (overdueAmount <= 0) continue;
    const earliestDue = applicable.reduce(
      (min, f) => (f.dueDate! < min ? f.dueDate! : min),
      applicable[0].dueDate!,
    );
    rows.push({
      studentId: e.studentId,
      name: `${e.student.lastName} ${e.student.firstName}`.trim(),
      className: e.classGroup.name,
      overdueAmount,
      daysOverdue: Math.max(1, Math.floor((today.getTime() - earliestDue.getTime()) / 86_400_000)),
    });
  }
  return rows.sort((a, b) => b.overdueAmount - a.overdueAmount);
}
