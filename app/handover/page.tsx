import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { HandoverBoard, type HandoverData } from "@/components/HandoverBoard";

export const dynamic = "force-dynamic";

export default async function HandoverPage() {
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

  const today = new Date(new Date().toISOString().slice(0, 10));
  const [classes, notes] = await Promise.all([
    prisma.classGroup.findMany({ where: { schoolId, deletedAt: null }, orderBy: [{ formLevel: "asc" }, { name: "asc" }] }),
    prisma.handoverNote.findMany({
      where: { schoolId, deletedAt: null, activeUntil: { gte: today } },
      orderBy: { activeUntil: "asc" },
      include: { classGroup: { select: { name: true } }, author: { select: { displayName: true } } },
    }),
  ]);

  const data: HandoverData = {
    schoolName: membership.school.name,
    isAdmin: membership.role === "ADMIN",
    myUserId: user.id,
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    notes: notes.map((n) => ({
      id: n.id,
      className: n.classGroup.name,
      body: n.body,
      until: n.activeUntil.toISOString().slice(0, 10),
      author: n.author.displayName,
      mine: n.authorUserId === user.id,
    })),
  };

  return <HandoverBoard data={data} />;
}
