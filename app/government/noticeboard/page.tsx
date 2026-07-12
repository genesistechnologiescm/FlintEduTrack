import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NationalNoticeboardManager, type NationalNoticeboardData } from "@/components/NationalNoticeboardManager";

export const dynamic = "force-dynamic";

// Ministry-side manager for the national noticeboard: post notices (they go
// through Flint review) and remove own ones with a stated reason.
export default async function GovernmentNoticeboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isGovernment: true, isFlintAdmin: true },
  });
  if (!me || (!me.isGovernment && !me.isFlintAdmin)) redirect("/login");

  const notices = await prisma.announcement.findMany({
    where: { audience: "NATIONAL", deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { author: { select: { displayName: true } } },
  });

  const data: NationalNoticeboardData = {
    notices: notices.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      status: n.status,
      author: n.author.displayName,
      date: n.createdAt.toISOString().slice(0, 10),
      mine: n.authorUserId === user.id,
    })),
    isFlint: me.isFlintAdmin,
  };
  return <NationalNoticeboardManager data={data} />;
}
