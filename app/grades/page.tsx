import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { GradeEntry, type GradeEntryData } from "@/components/GradeEntry";

export const dynamic = "force-dynamic";

export default async function GradesPage() {
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

  const [classes, subjects, year] = await Promise.all([
    prisma.classGroup.findMany({ where: { schoolId, deletedAt: null }, orderBy: [{ formLevel: "asc" }, { name: "asc" }] }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      include: { terms: { orderBy: { order: "asc" } } },
    }),
  ]);

  const data: GradeEntryData = {
    schoolName: membership.school.name,
    isAdmin: membership.role === "ADMIN",
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
    terms: (year?.terms ?? []).map((t) => ({ id: t.id, label: t.label, sequenceCount: t.sequenceCount })),
  };

  return <GradeEntry data={data} />;
}
