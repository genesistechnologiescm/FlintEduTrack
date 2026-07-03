import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Library, type LibraryData } from "@/components/Library";

export const dynamic = "force-dynamic";

// The digital library is a shared shelf for every signed-in user. Only APPROVED
// items appear; staff may submit contributions (reviewed by a Flint curator).
export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [items, membership, me, mySubmissions, pendingCount] = await Promise.all([
    prisma.libraryItem.findMany({
      where: { deletedAt: null, status: "APPROVED" },
      orderBy: [{ subject: "asc" }, { year: "desc" }, { paper: "asc" }],
      take: 500,
    }),
    prisma.schoolMembership.findFirst({
      where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { isFlintAdmin: true } }),
    prisma.libraryItem.findMany({
      where: { createdBy: user.id, deletedAt: null, status: { in: ["PENDING", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.libraryItem.count({ where: { status: "PENDING", deletedAt: null } }),
  ]);

  const data: LibraryData = {
    items: items.map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      subject: i.subject,
      exam: i.exam,
      year: i.year,
      paper: i.paper,
      url: i.url,
      body: i.body,
    })),
    canContribute: !!membership,
    isCurator: !!me?.isFlintAdmin,
    pendingCount,
    mySubmissions: mySubmissions.map((i) => ({ title: i.title, status: i.status as "PENDING" | "REJECTED" })),
  };

  return <Library data={data} />;
}
