import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ResourcesManager, type ResourcesData } from "@/components/ResourcesManager";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
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

  const [subjects, classes, resources] = await Promise.all([
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.classGroup.findMany({ where: { schoolId, deletedAt: null }, orderBy: [{ formLevel: "asc" }, { name: "asc" }] }),
    prisma.lessonResource.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { subject: { select: { name: true } }, classGroup: { select: { name: true } } },
    }),
  ]);

  const data: ResourcesData = {
    schoolName: membership.school.name,
    isAdmin: membership.role === "ADMIN",
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    resources: resources.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      url: r.url,
      body: r.body,
      subject: r.subject.name,
      target: r.classGroup?.name ?? null,
    })),
  };

  return <ResourcesManager data={data} />;
}
