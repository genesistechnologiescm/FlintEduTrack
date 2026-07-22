import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { TimetableManager, type TimetableData } from "@/components/TimetableManager";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
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

  const [classes, subjects, staff, slots] = await Promise.all([
    prisma.classGroup.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.schoolMembership.findMany({
      where: { schoolId, role: "TEACHER", status: "active" },
      include: { user: { select: { id: true, displayName: true } } },
    }),
    prisma.timetableSlot.findMany({
      where: { schoolId },
      include: { subject: true, teacher: { select: { displayName: true } } },
    }),
  ]);

  const data: TimetableData = {
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
    teachers: staff.map((m) => ({ id: m.user.id, name: m.user.displayName })),
    slots: slots.map((s) => ({
      id: s.id,
      classGroupId: s.classGroupId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      subjectName: s.subject.name,
      teacherName: s.teacher.displayName,
      room: s.room,
    })),
  };

  return <TimetableManager data={data} />;
}
