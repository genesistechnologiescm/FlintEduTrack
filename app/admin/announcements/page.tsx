import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementsManager, type AnnouncementsData } from "@/components/AnnouncementsManager";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
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

  const [classes, sent] = await Promise.all([
    prisma.classGroup.findMany({ where: { schoolId, deletedAt: null }, orderBy: [{ formLevel: "asc" }, { name: "asc" }] }),
    prisma.announcement.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { author: { select: { displayName: true } }, classGroup: { select: { name: true } }, _count: { select: { receipts: true } } },
    }),
  ]);

  const data: AnnouncementsData = {
    schoolName: membership.school.name,
    isAdmin: membership.role === "ADMIN",
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    sent: sent.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audienceLabel: a.audience === "CLASS" ? a.classGroup?.name ?? "Class" : "school",
      isClass: a.audience === "CLASS",
      recipients: a._count.receipts,
      author: a.author.displayName,
      date: a.createdAt.toISOString().slice(0, 10),
    })),
  };

  return <AnnouncementsManager data={data} />;
}
