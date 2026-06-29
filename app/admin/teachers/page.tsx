import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { TeachersManager, type TeachersData } from "@/components/TeachersManager";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
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

  const [memberships, classes, subjects, slots] = await Promise.all([
    prisma.schoolMembership.findMany({
      where: { schoolId, role: "TEACHER", status: "active" },
      include: { user: true },
    }),
    prisma.classGroup.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.timetableSlot.findMany({
      where: { schoolId },
      include: { subject: true, classGroup: true },
    }),
  ]);

  const byTeacher = new Map<string, string[]>();
  for (const s of slots) {
    const list = byTeacher.get(s.teacherUserId) ?? [];
    list.push(`${s.subject.name} · ${s.classGroup.name}`);
    byTeacher.set(s.teacherUserId, list);
  }

  const data: TeachersData = {
    schoolName: membership.school.name,
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
    teachers: memberships.map((m) => ({
      userId: m.userId,
      name: m.user.displayName,
      phone: m.user.phone,
      assignments: [...new Set(byTeacher.get(m.userId) ?? [])],
    })),
  };

  return <TeachersManager data={data} />;
}
