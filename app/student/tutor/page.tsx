import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { tutorConfigured } from "@/lib/ai/tutor";
import { ChariotChat } from "@/components/ChariotChat";

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const account = await prisma.studentAccount.findUnique({
    where: { id: user.id },
    include: { student: { select: { firstName: true } } },
  });
  if (!account) redirect("/login");

  return <ChariotChat firstName={account.student.firstName} configured={tutorConfigured()} />;
}
