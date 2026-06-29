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

  const [classes, enrollments] = await Promise.all([
    prisma.classGroup.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({
      where: { schoolId, status: "ACTIVE" },
      include: { student: true, classGroup: true },
      orderBy: { enrolledAt: "desc" },
      take: 200,
    }),
  ]);

  const data: StudentsData = {
    schoolName: membership.school.name,
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    students: enrollments.map((e) => ({
      name: `${e.student.lastName} ${e.student.firstName}`,
      className: e.classGroup.name,
    })),
  };

  return <StudentsManager data={data} />;
}
