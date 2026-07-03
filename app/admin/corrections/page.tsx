import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CorrectionsPanel, type CorrectionsData } from "@/components/CorrectionsPanel";

export const dynamic = "force-dynamic";

export default async function CorrectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active", adminScope: "FULL" },
    include: { school: true },
  });
  if (!membership) redirect("/login");
  const schoolId = membership.schoolId;

  const [pending, decided] = await Promise.all([
    prisma.gradeCorrection.findMany({
      where: { schoolId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        grade: { include: { student: true, subject: { select: { name: true } } } },
        requester: { select: { displayName: true } },
      },
    }),
    prisma.gradeCorrection.findMany({
      where: { schoolId, status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { decidedAt: "desc" },
      take: 8,
      include: {
        grade: { include: { student: true, subject: { select: { name: true } } } },
        requester: { select: { displayName: true } },
      },
    }),
  ]);

  const shape = (r: (typeof pending)[number]) => ({
    id: r.id,
    student: `${r.grade.student.firstName} ${r.grade.student.lastName}`,
    subject: r.grade.subject.name,
    sequence: r.grade.sequence,
    oldScore: Number(r.oldScore),
    newScore: Number(r.newScore),
    requester: r.requester.displayName,
    date: r.createdAt.toISOString().slice(0, 10),
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
  });

  const data: CorrectionsData = {
    schoolName: membership.school.name,
    pending: pending.map(shape),
    decided: decided.map(shape),
  };

  return <CorrectionsPanel data={data} />;
}
