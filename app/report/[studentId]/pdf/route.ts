import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadReportData } from "@/lib/reportData";
import { renderReportCardPdf, type PdfLang } from "@/lib/pdf/reportCardPdf";

export const dynamic = "force-dynamic";

// GET /report/[studentId]/pdf?lang=en|fr — downloadable branded report card.
// Same authorization as the HTML page (shared loader): linked parent, school
// staff, or the student themself.
export async function GET(req: NextRequest, ctx: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const result = await loadReportData(studentId, user.id);
  if (!result.ok) {
    return new NextResponse(result.reason === "not_found" ? "Not found" : "Forbidden", {
      status: result.reason === "not_found" ? 404 : 403,
    });
  }

  const lang: PdfLang = req.nextUrl.searchParams.get("lang") === "fr" ? "fr" : "en";
  const pdf = await renderReportCardPdf(result.data, lang);

  const safeName = result.data.studentName.replace(/[^a-zA-Z0-9]+/g, "_");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="EduTrack_ReportCard_${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
