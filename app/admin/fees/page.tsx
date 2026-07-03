import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AdminFees, type AdminFeesData } from "@/components/AdminFees";
import { computeOverdue } from "@/lib/overdue";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
    include: { school: true },
  });
  if (!membership) redirect("/login");
  const schoolId = membership.schoolId;

  const [classes, year, enrollments, payments, paidAgg] = await Promise.all([
    prisma.classGroup.findMany({ where: { schoolId, deletedAt: null }, orderBy: [{ formLevel: "asc" }, { name: "asc" }] }),
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
    prisma.enrollment.findMany({ where: { schoolId, status: "ACTIVE" }, select: { classGroupId: true } }),
    prisma.payment.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" }, take: 10, include: { student: true } }),
    prisma.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
  ]);

  const term = year ? await prisma.term.findFirst({ where: { academicYearId: year.id }, orderBy: { order: "asc" } }) : null;
  const fees = term
    ? await prisma.feeItem.findMany({
        where: { schoolId, termId: term.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { classGroup: { select: { name: true } } },
      })
    : [];

  const total = enrollments.length;
  const countByClass = new Map<string, number>();
  for (const e of enrollments) countByClass.set(e.classGroupId, (countByClass.get(e.classGroupId) ?? 0) + 1);

  let billed = 0;
  const feeRows = fees.map((f) => {
    const applicable = f.classGroupId ? countByClass.get(f.classGroupId) ?? 0 : total;
    billed += f.amount * applicable;
    return { id: f.id, label: f.label, amount: f.amount, target: f.classGroup?.name ?? null, applicable };
  });
  const collected = paidAgg._sum.amount ?? 0;

  const overdue = await computeOverdue(schoolId);

  const data: AdminFeesData = {
    schoolName: membership.school.name,
    termLabel: term?.label ?? null,
    billed,
    collected,
    overdue,
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    fees: feeRows,
    payments: payments.map((p) => ({
      id: p.id,
      student: `${p.student.firstName} ${p.student.lastName}`,
      amount: p.amount,
      reference: p.reference,
      method: p.method,
      date: p.createdAt.toISOString().slice(0, 10),
    })),
  };

  return <AdminFees data={data} />;
}
