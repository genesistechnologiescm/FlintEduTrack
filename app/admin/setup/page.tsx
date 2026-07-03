import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SchoolSetup, type SetupData } from "@/components/SchoolSetup";

export const dynamic = "force-dynamic";

const FORM_LABELS: Record<number, string> = {
  1: "Form 1", 2: "Form 2", 3: "Form 3", 4: "Form 4", 5: "Form 5",
  6: "Lower Sixth", 7: "Upper Sixth",
};

export default async function SetupPage() {
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

  const [classes, subjects, year, components] = await Promise.all([
    prisma.classGroup.findMany({ where: { schoolId, deletedAt: null }, orderBy: [{ formLevel: "asc" }, { name: "asc" }] }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
    prisma.assessmentComponent.findMany({ where: { schoolId, deletedAt: null }, orderBy: { order: "asc" } }),
  ]);

  const data: SetupData = {
    schoolName: membership.school.name,
    yearLabel: year?.label ?? null,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      form: FORM_LABELS[c.formLevel] ?? `Form ${c.formLevel}`,
      stream: c.streamType,
    })),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name, code: s.code, stream: s.streamType })),
    components: components.map((c) => ({ id: c.id, name: c.name, weight: c.weight })),
  };

  return <SchoolSetup data={data} />;
}
