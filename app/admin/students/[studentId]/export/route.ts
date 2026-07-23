import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// GET /admin/students/[studentId]/export
// Right-to-access: an admin downloads everything the school holds about one
// student, as JSON. Scoped to the caller's own school. The access itself is
// audited (who exported whom, and when).
export async function GET(_req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", _req.url));

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
  });
  if (!membership) return NextResponse.redirect(new URL("/login", _req.url));
  const schoolId = membership.schoolId;

  const enrollment = await prisma.enrollment.findFirst({ where: { studentId, schoolId } });
  if (!enrollment) return new NextResponse("Not found", { status: 404 });

  const [student, enrollments, attendance, grades, payments, links, wellbeing] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.enrollment.findMany({ where: { studentId }, include: { classGroup: { select: { name: true } }, school: { select: { name: true } } } }),
    prisma.attendanceRecord.findMany({
      where: { studentId },
      include: { session: { select: { date: true, subjectId: true } } },
      orderBy: { session: { date: "desc" } },
    }),
    prisma.grade.findMany({ where: { studentId }, include: { subject: { select: { name: true } } } }),
    prisma.payment.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } }),
    prisma.parentLink.findMany({ where: { studentId }, include: { parent: { select: { displayName: true, phone: true, preferredLang: true } } } }),
    prisma.wellbeingSnapshot.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: user.id,
    note: "Personal data held by the school about this student, exported on request.",
    student,
    enrollments: enrollments.map((e) => ({ school: e.school.name, class: e.classGroup.name, stream: e.streamType, status: e.status, enrolledAt: e.enrolledAt })),
    guardians: links.map((l) => ({ name: l.parent.displayName, phone: l.parent.phone, language: l.parent.preferredLang, relationship: l.relationship })),
    attendance: attendance.map((r) => ({ date: r.session.date, status: r.status })),
    grades: grades.map((g) => ({ subject: g.subject.name, sequence: g.sequence, score: Number(g.score) })),
    payments: payments.map((p) => ({ amount: p.amount, method: p.method, reference: p.reference, at: p.createdAt })),
    wellbeing: wellbeing.map((w) => ({ week: w.weekStart, level: w.level })),
  };

  await writeAudit({
    schoolId,
    actorUserId: user.id,
    action: "student.data_exported",
    entityType: "Student",
    entityId: studentId,
  });

  const name = student ? `${student.lastName}_${student.firstName}`.replace(/[^a-zA-Z0-9_]/g, "") : studentId;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="EduTrack_${name}_data.json"`,
    },
  });
}
