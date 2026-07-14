import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SchoolRegistry, type RegistryData } from "@/components/SchoolRegistry";

export const dynamic = "force-dynamic";

// Flint owner area: the platform admin's school registry. Gated to isFlintAdmin.
export default async function FlintPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { isFlintAdmin: true } });
  if (!me?.isFlintAdmin) redirect("/login");

  const schools = await prisma.school.findMany({
    where: { deletedAt: null },
    orderBy: [{ isTest: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      region: true,
      town: true,
      isTest: true,
      isCrisisZone: true,
      _count: { select: { enrollments: true, memberships: true } },
    },
  });

  const data: RegistryData = {
    schools: schools.map((s) => ({
      id: s.id,
      name: s.name,
      region: s.region,
      town: s.town,
      isTest: s.isTest,
      crisis: s.isCrisisZone,
      students: s._count.enrollments,
      staff: s._count.memberships,
    })),
  };

  return <SchoolRegistry data={data} />;
}
