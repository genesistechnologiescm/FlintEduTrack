import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ParentResources, type ParentResourcesData } from "@/components/ParentResources";

export const dynamic = "force-dynamic";

export default async function ParentResourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const links = await prisma.parentLink.findMany({
    where: { parentUserId: user.id, status: "active" },
    include: { student: true },
  });

  const children: ParentResourcesData["children"] = [];
  for (const link of links) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: link.studentId, status: "ACTIVE" },
      include: { school: true, classGroup: true },
      orderBy: { enrolledAt: "desc" },
    });
    if (!enrollment) continue;

    // Resources for this child's school, targeted at their class or the whole subject.
    const resources = await prisma.lessonResource.findMany({
      where: {
        schoolId: enrollment.schoolId,
        deletedAt: null,
        OR: [{ classGroupId: enrollment.classGroupId }, { classGroupId: null }],
      },
      orderBy: { createdAt: "desc" },
      include: { subject: { select: { name: true } } },
    });

    const bySubject = new Map<string, ParentResourcesData["children"][number]["subjects"][number]>();
    for (const r of resources) {
      const group = bySubject.get(r.subject.name) ?? { subject: r.subject.name, items: [] };
      group.items.push({ id: r.id, title: r.title, type: r.type, url: r.url, body: r.body });
      bySubject.set(r.subject.name, group);
    }

    children.push({
      name: `${link.student.firstName} ${link.student.lastName}`,
      className: enrollment.classGroup.name,
      school: enrollment.school.name,
      subjects: [...bySubject.values()],
    });
  }

  return <ParentResources data={{ children }} />;
}
