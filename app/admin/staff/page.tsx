import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { StaffManager, type StaffData } from "@/components/StaffManager";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
    include: { school: true },
  });
  if (!membership) redirect("/login");
  const schoolId = membership.schoolId;

  const staff = await prisma.schoolMembership.findMany({
    where: { schoolId, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
    include: { user: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  const data: StaffData = {
    schoolName: membership.school.name,
    staff: staff.map((m) => ({
      userId: m.userId,
      name: m.user.displayName,
      phone: m.user.phone,
      role: m.role as "ADMIN" | "TEACHER",
      title: m.title,
      isSelf: m.userId === user.id,
    })),
  };

  return <StaffManager data={data} />;
}
