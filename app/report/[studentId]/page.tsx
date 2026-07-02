import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportCard } from "@/components/ReportCard";
import { loadReportData } from "@/lib/reportData";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Authz + data via the shared loader (also used by the PDF route): linked
  // parent, school staff, or the student themself.
  const result = await loadReportData(studentId, user.id);
  if (!result.ok) {
    if (result.reason === "not_found") notFound();
    redirect("/login");
  }

  return <ReportCard data={result.data} studentId={studentId} />;
}
