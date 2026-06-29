"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomUUID, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { studentCodeToAuthEmail } from "@/lib/auth";
import { provisionAuthUser, authProvisioningAvailable } from "@/lib/provisionAuth";

async function adminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const m = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, role: "ADMIN", status: "active" },
  });
  if (!m) throw new Error("Not authorized");
  return { userId: user.id, schoolId: m.schoolId };
}

const StudentSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  gender: z.string().trim().max(1).optional(),
  classGroupId: z.string().uuid(),
  parentPhone: z.string().trim().min(6).max(20),
  parentName: z.string().trim().max(80).optional(),
});
type StudentInput = z.infer<typeof StudentSchema>;

// Creates Student + Enrollment + (reused-or-new) parent User + ParentLink.
// Parent is matched by phone — platform-level identity, so the same parent
// across schools/children is one account.
async function createOne(schoolId: string, input: StudentInput): Promise<string> {
  const klass = await prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } });
  if (!klass) throw new Error("Class not in your school");

  const student = await prisma.student.create({
    data: { firstName: input.firstName, lastName: input.lastName, gender: input.gender || null },
  });
  await prisma.enrollment.create({
    data: { studentId: student.id, schoolId, classGroupId: klass.id, streamType: klass.streamType, status: "ACTIVE" },
  });

  let parent = await prisma.user.findUnique({ where: { phone: input.parentPhone } });
  if (!parent) {
    parent = await prisma.user.create({
      data: { id: randomUUID(), phone: input.parentPhone, displayName: input.parentName || `Parent of ${input.firstName}` },
    });
  }
  await prisma.parentLink.upsert({
    where: { parentUserId_studentId_schoolId: { parentUserId: parent.id, studentId: student.id, schoolId } },
    update: { status: "active", receivesAlerts: true },
    create: { parentUserId: parent.id, studentId: student.id, schoolId, relationship: "GUARDIAN", isPrimary: true, receivesAlerts: true },
  });
  return student.id;
}

export async function addStudent(raw: StudentInput): Promise<{ ok: boolean }> {
  const input = StudentSchema.parse(raw);
  const { userId, schoolId } = await adminContext();
  const id = await createOne(schoolId, input);
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "student.enrolled",
    entityType: "Student",
    entityId: id,
    after: { name: `${input.firstName} ${input.lastName}` },
  });
  revalidatePath("/admin/students");
  return { ok: true };
}

// Bulk CSV: one student per line — First,Last,Gender,Class,ParentPhone,ParentName
export async function bulkAddStudents(csv: string): Promise<{ added: number; failed: number }> {
  const { userId, schoolId } = await adminContext();
  const classes = await prisma.classGroup.findMany({ where: { schoolId } });
  const byName = new Map(classes.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let added = 0;
  let failed = 0;
  for (const line of lines) {
    const [firstName, lastName, gender, className, parentPhone, parentName] = line
      .split(",")
      .map((s) => (s ?? "").trim());
    if (/first\s*name/i.test(firstName)) continue; // header row
    const classGroupId = byName.get((className || "").toLowerCase());
    if (!firstName || !lastName || !classGroupId || !parentPhone) {
      failed++;
      continue;
    }
    try {
      await createOne(schoolId, { firstName, lastName, gender, classGroupId, parentPhone, parentName });
      added++;
    } catch {
      failed++;
    }
  }
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "student.bulk_enrolled",
    entityType: "School",
    entityId: schoolId,
    after: { added, failed },
  });
  revalidatePath("/admin/students");
  return { added, failed };
}

// Issue a student a login (code + PIN) so they can see their own attendance,
// grades and lessons. Provisions a GoTrue account in the `s…` email namespace.
export async function enableStudentLogin(studentId: string): Promise<{ ok: boolean; code?: string; pin?: string; existing?: boolean; error?: string }> {
  const { userId, schoolId } = await adminContext();

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, schoolId, status: "ACTIVE" },
    include: { student: true },
  });
  if (!enrollment) return { ok: false, error: "Student not in your school" };

  const existing = await prisma.studentAccount.findUnique({ where: { studentId } });
  if (existing) return { ok: true, code: existing.loginCode, existing: true };

  if (!authProvisioningAvailable()) return { ok: false, error: "Student logins aren't configured on the server" };

  // Unique, typeable code: 3 letters of surname + 4 digits.
  const stem = (enrollment.student.lastName.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "STU").padEnd(3, "X");
  let code = "";
  for (let i = 0; i < 6; i++) {
    const candidate = `${stem}${randomInt(1000, 9999)}`;
    if (!(await prisma.studentAccount.findUnique({ where: { loginCode: candidate } }))) {
      code = candidate;
      break;
    }
  }
  if (!code) return { ok: false, error: "Could not allocate a code, try again" };

  const pin = String(randomInt(10000, 99999));
  const authId = await provisionAuthUser(studentCodeToAuthEmail(code), pin, {
    displayName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
    role: "student",
  });
  if (!authId) return { ok: false, error: "Could not create the login, try again" };

  await prisma.studentAccount.create({ data: { id: authId, studentId, schoolId, loginCode: code } });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "student.login_enabled",
    entityType: "StudentAccount",
    entityId: authId,
    after: { studentId, code },
  });
  revalidatePath("/admin/students");
  return { ok: true, code, pin };
}
