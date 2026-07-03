import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { UssdSimulator } from "@/components/UssdSimulator";

export const dynamic = "force-dynamic";

// Admin-gated simulator for the feature-phone story: runs the SAME handler the
// telco USSD callback will call at activation.
export default async function UssdDemoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
  });
  if (!membership) redirect("/login");

  return <UssdSimulator defaultPhone="+237699000001" />;
}
