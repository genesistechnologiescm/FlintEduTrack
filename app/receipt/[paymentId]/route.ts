import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { renderReceiptPdf, type ReceiptLang } from "@/lib/pdf/receiptPdf";

export const dynamic = "force-dynamic";

// GET /receipt/[paymentId]?lang=en|fr — downloadable fee receipt.
// Authz: the payer, a linked parent of the student, or staff of the school.
export async function GET(req: NextRequest, ctx: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: true, school: true },
  });
  if (!payment) return new NextResponse("Not found", { status: 404 });

  const isPayer = payment.paidByUserId === user.id;
  const [link, staff] = await Promise.all([
    prisma.parentLink.findFirst({ where: { parentUserId: user.id, studentId: payment.studentId, status: "active" } }),
    prisma.schoolMembership.findFirst({ where: { userId: user.id, schoolId: payment.schoolId, status: "active" } }),
  ]);
  if (!isPayer && !link && !staff) return new NextResponse("Forbidden", { status: 403 });

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: payment.studentId, schoolId: payment.schoolId },
    include: { classGroup: true },
    orderBy: { enrolledAt: "desc" },
  });

  const lang: ReceiptLang = req.nextUrl.searchParams.get("lang") === "fr" ? "fr" : "en";
  const pdf = await renderReceiptPdf(
    {
      school: payment.school.name,
      student: `${payment.student.firstName} ${payment.student.lastName}`,
      className: enrollment?.classGroup.name ?? "—",
      amountFcfa: payment.amount,
      method: payment.method === "MOMO" ? "MTN Mobile Money" : "Cash",
      reference: payment.reference,
      date: payment.createdAt.toISOString().slice(0, 10),
    },
    lang,
  );

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="EduTrack_Receipt_${payment.reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
