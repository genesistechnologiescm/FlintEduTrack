import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CuratePanel, type CurateData } from "@/components/CuratePanel";

export const dynamic = "force-dynamic";

// Flint-curator console: review teacher submissions to the national library.
export default async function CuratePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { isFlintAdmin: true } });
  if (!me?.isFlintAdmin) redirect("/login");

  const pending = await prisma.libraryItem.findMany({
    where: { status: "PENDING", deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const submitterIds = [...new Set(pending.map((p) => p.createdBy))];
  const schoolIds = [...new Set(pending.map((p) => p.schoolId).filter((s): s is string => !!s))];
  const [submitters, schools] = await Promise.all([
    submitterIds.length
      ? prisma.user.findMany({ where: { id: { in: submitterIds } }, select: { id: true, displayName: true } })
      : Promise.resolve([]),
    schoolIds.length
      ? prisma.school.findMany({ where: { id: { in: schoolIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  const nameById = new Map(submitters.map((u) => [u.id, u.displayName]));
  const schoolById = new Map(schools.map((s) => [s.id, s.name]));

  const data: CurateData = {
    pending: pending.map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      subject: i.subject,
      exam: i.exam,
      url: i.url,
      body: i.body,
      submitter: nameById.get(i.createdBy) ?? "—",
      school: i.schoolId ? schoolById.get(i.schoolId) ?? "—" : "Flint",
      date: i.createdAt.toISOString().slice(0, 10),
    })),
  };

  return <CuratePanel data={data} />;
}
