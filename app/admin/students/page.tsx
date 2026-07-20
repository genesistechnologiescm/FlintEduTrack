import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { StudentsManager, type StudentsData } from "@/components/StudentsManager";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
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

  const [classes, enrollments, accounts, links] = await Promise.all([
    prisma.classGroup.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({
      where: { schoolId, status: "ACTIVE" },
      include: { student: true, classGroup: true },
      orderBy: { enrolledAt: "desc" },
      take: 500,
    }),
    prisma.studentAccount.findMany({ where: { schoolId }, select: { studentId: true, loginCode: true } }),
    prisma.parentLink.findMany({
      where: { schoolId, status: "active" },
      orderBy: { isPrimary: "desc" },
      include: { parent: { select: { id: true, phone: true, authProvisionedAt: true } } },
    }),
  ]);

  const codeByStudent = new Map(accounts.map((a) => [a.studentId, a.loginCode]));
  // Primary guardian per student (isPrimary sorts first).
  const parentByStudent = new Map<string, { id: string; phone: string; provisioned: boolean }>();
  for (const l of links) {
    if (!parentByStudent.has(l.studentId)) {
      parentByStudent.set(l.studentId, { id: l.parent.id, phone: l.parent.phone, provisioned: !!l.parent.authProvisionedAt });
    }
  }

  const data: StudentsData = {
    schoolName: membership.school.name,
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    students: enrollments.map((e) => ({
      id: e.studentId,
      name: `${e.student.lastName} ${e.student.firstName}`,
      className: e.classGroup.name,
      loginCode: codeByStudent.get(e.studentId) ?? null,
      parent: parentByStudent.get(e.studentId) ?? null,
    })),
  };

  return <StudentsManager data={data} />;
}
