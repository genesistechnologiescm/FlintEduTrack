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

  // Engagement summary per piece of content (views deduped per student per day).
  const viewRows = await prisma.resourceView.findMany({
    where: { resourceId: { in: resources.map((r) => r.id) } },
    select: { resourceId: true, userId: true },
  });
  const engagement = new Map<string, { views: number; students: Set<string> }>();
  for (const v of viewRows) {
    const g = engagement.get(v.resourceId) ?? { views: 0, students: new Set<string>() };
    g.views++;
    g.students.add(v.userId);
    engagement.set(v.resourceId, g);
  }

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
      views: engagement.get(r.id)?.views ?? 0,
      reach: engagement.get(r.id)?.students.size ?? 0,
    })),
  };

  return <ResourcesManager data={data} />;
}
