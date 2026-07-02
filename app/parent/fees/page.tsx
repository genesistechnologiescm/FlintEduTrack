import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getStudentBalance } from "@/lib/feeBalance";
import { ParentFees, type ParentFeesData } from "@/components/ParentFees";

export const dynamic = "force-dynamic";

export default async function ParentFeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [me, links] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.parentLink.findMany({ where: { parentUserId: user.id, status: "active" }, include: { student: true } }),
  ]);

  const children: ParentFeesData["children"] = [];
  for (const link of links) {
    const [enrollment, balance, payments] = await Promise.all([
      prisma.enrollment.findFirst({
        where: { studentId: link.studentId, status: "ACTIVE" },
        include: { school: true, classGroup: true },
        orderBy: { enrolledAt: "desc" },
      }),
      getStudentBalance(link.studentId),
      prisma.payment.findMany({ where: { studentId: link.studentId }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    children.push({
      studentId: link.studentId,
      name: `${link.student.firstName} ${link.student.lastName}`,
      school: enrollment?.school.name ?? "—",
      className: enrollment?.classGroup.name ?? "—",
      billed: balance.billed,
      paid: balance.paid,
      balance: balance.balance,
      payments: payments.map((p) => ({ id: p.id, amount: p.amount, reference: p.reference, date: p.createdAt.toISOString().slice(0, 10) })),
    });
  }

  const data: ParentFeesData = { parentPhone: me?.phone ?? "", children };
  return <ParentFees data={data} />;
}
