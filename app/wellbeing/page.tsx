import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { wellbeingWeekStartISO } from "@/lib/wellbeing";
import { WellbeingBoard, type WellbeingData } from "@/components/WellbeingBoard";

export const dynamic = "force-dynamic";

// Weekly pastoral snapshot: pick a class, tap each student's read for the week.
export default async function WellbeingPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { class: classParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
    include: { school: true },
  });
  if (!membership) redirect("/login");
  const schoolId = membership.schoolId;

  const classes = await prisma.classGroup.findMany({
    where: { schoolId, deletedAt: null },
    orderBy: [{ formLevel: "asc" }, { name: "asc" }],
  });
  const classGroupId = classParam && classes.some((c) => c.id === classParam) ? classParam : classes[0]?.id;

  const weekStartISO = wellbeingWeekStartISO();
  const enrollments = classGroupId
    ? await prisma.enrollment.findMany({
        where: { classGroupId, schoolId, status: "ACTIVE" },
        include: { student: true },
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
      })
    : [];
  const snapshots = enrollments.length
    ? await prisma.wellbeingSnapshot.findMany({
        where: { weekStart: new Date(weekStartISO), studentId: { in: enrollments.map((e) => e.studentId) } },
      })
    : [];
  const levelByStudent = new Map(snapshots.map((s) => [s.studentId, s.level]));

  const data: WellbeingData = {
    schoolName: membership.school.name,
    isAdmin: membership.role === "ADMIN",
    weekStartISO,
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    classGroupId: classGroupId ?? "",
    students: enrollments.map((e) => ({
      studentId: e.studentId,
      name: `${e.student.lastName} ${e.student.firstName}`.trim(),
      level: (levelByStudent.get(e.studentId) ?? null) as WellbeingData["students"][number]["level"],
    })),
  };

  return <WellbeingBoard data={data} />;
}
