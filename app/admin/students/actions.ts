"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomUUID, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/adminScope";
import { studentCodeToAuthEmail, phoneToAuthEmail, canonicalCmPhone } from "@/lib/auth";
import {
  provisionAuthUser,
  provisionAuthUserResult,
  findAuthUserIdByEmail,
  setAuthPassword,
  authProvisioningAvailable,
} from "@/lib/provisionAuth";

// Scoped authorization — see lib/adminScope.ts.
async function adminContext() {
  return requireAdmin();
}

const StudentSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  gender: z.string().trim().max(1).optional(),
  classGroupId: z.string().uuid(),
  parentPhone: z.string().trim().min(6).max(20),
  parentName: z.string().trim().max(80).optional(),
  // Contact-capability capture (Phase-1 spec): what can the parent's phone do?
  // This single answer sets the school's SMS bill — free push vs paid SMS.
  parentCapability: z.enum(["SMARTPHONE", "WHATSAPP", "SMS_ONLY", "VOICE_ONLY"]).optional(),
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

  // Canonical shape ("+237XXXXXXXXX") so cross-format entries dedupe to one
  // platform-level parent account and match seeded/provisioned rows.
  const parentPhone = canonicalCmPhone(input.parentPhone);
  let parent = await prisma.user.findUnique({ where: { phone: parentPhone } });
  if (!parent) {
    parent = await prisma.user.create({
      data: {
        id: randomUUID(),
        phone: parentPhone,
        displayName: input.parentName || `Parent of ${input.firstName}`,
        contactCapability: input.parentCapability ?? null,
      },
    });
  } else if (input.parentCapability) {
    // Re-declared at a later enrolment — keep the newest answer.
    parent = await prisma.user.update({ where: { id: parent.id }, data: { contactCapability: input.parentCapability } });
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
    must_change_pin: true,
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

// ── Parent logins ────────────────────────────────────────────────────────────
// Parents created at enrolment are records only (no auth). Enabling a login
// mints a phone+PIN auth account. GoTrue assigns the auth id, and the app's
// invariant is User.id === auth.users.id — so when they differ we re-key the
// parent's User row (and every referencing row) to the auth id in ONE
// transaction. All 15 FK-constrained columns plus the two loose ones
// (NotificationLog, ResourceView) move together: history follows the parent.
async function rekeyUserId(oldId: string, newId: string, phone: string): Promise<void> {
  const tempPhone = `${phone}#rekey`;
  await prisma.$transaction([
    prisma.$executeRaw`INSERT INTO "User" (id, phone, "displayName", "preferredLang", "contactCapability", "authProvisionedAt", "isFlintAdmin", "isGovernment", status, "createdAt", "deletedAt")
      SELECT ${newId}, ${tempPhone}, "displayName", "preferredLang", "contactCapability", "authProvisionedAt", "isFlintAdmin", "isGovernment", status, "createdAt", "deletedAt" FROM "User" WHERE id = ${oldId}`,
    prisma.$executeRaw`UPDATE "SchoolMembership" SET "userId" = ${newId} WHERE "userId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "AuthDevice" SET "userId" = ${newId} WHERE "userId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "ParentLink" SET "parentUserId" = ${newId} WHERE "parentUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "ParentChannel" SET "parentUserId" = ${newId} WHERE "parentUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "TimetableSlot" SET "teacherUserId" = ${newId} WHERE "teacherUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "HandoverNote" SET "authorUserId" = ${newId} WHERE "authorUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "GateCheckIn" SET "userId" = ${newId} WHERE "userId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "GradeCorrection" SET "requestedBy" = ${newId} WHERE "requestedBy" = ${oldId}`,
    prisma.$executeRaw`UPDATE "Announcement" SET "authorUserId" = ${newId} WHERE "authorUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "AnnouncementReceipt" SET "parentUserId" = ${newId} WHERE "parentUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "MessageThread" SET "parentUserId" = ${newId} WHERE "parentUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "MessageThread" SET "staffUserId" = ${newId} WHERE "staffUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "Message" SET "senderUserId" = ${newId} WHERE "senderUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "LessonResource" SET "createdBy" = ${newId} WHERE "createdBy" = ${oldId}`,
    prisma.$executeRaw`UPDATE "Payment" SET "paidByUserId" = ${newId} WHERE "paidByUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "NotificationLog" SET "parentUserId" = ${newId} WHERE "parentUserId" = ${oldId}`,
    prisma.$executeRaw`UPDATE "ResourceView" SET "userId" = ${newId} WHERE "userId" = ${oldId}`,
    prisma.$executeRaw`DELETE FROM "User" WHERE id = ${oldId}`,
    prisma.$executeRaw`UPDATE "User" SET phone = ${phone} WHERE id = ${newId}`,
  ]);
}

// Mints (or resets) a parent's phone+PIN login and returns the PIN once.
// Authz: the caller must be an admin of a school this parent has an active
// link in — the same boundary the roster page shows.
export async function enableParentLogin(parentUserId: string): Promise<{ ok: boolean; pin?: string; error?: string }> {
  const { userId, schoolId } = await adminContext();
  const link = await prisma.parentLink.findFirst({
    where: { parentUserId, schoolId, status: "active" },
    include: { parent: true },
  });
  if (!link) return { ok: false, error: "Not a parent of your school" };
  if (!authProvisioningAvailable()) return { ok: false, error: "Login provisioning is not configured on this server" };

  const parent = link.parent;
  const pin = String(randomInt(10000, 99999));
  const email = phoneToAuthEmail(parent.phone);

  let authId: string | null = null;
  const res = await provisionAuthUserResult(email, pin, { displayName: parent.displayName, phone: parent.phone, must_change_pin: true });
  if (res.ok) {
    authId = res.id;
  } else if (res.status === 401 || res.status === 403) {
    return { ok: false, error: "The server's service key is invalid" };
  } else {
    // Most likely "email exists": a login was minted before — re-align + reset PIN.
    authId = await findAuthUserIdByEmail(email);
    if (!authId || !(await setAuthPassword(authId, pin))) {
      return { ok: false, error: "Could not create the login, try again" };
    }
  }

  if (authId !== parent.id) await rekeyUserId(parent.id, authId, parent.phone);
  await prisma.user.update({ where: { id: authId }, data: { authProvisionedAt: new Date() } });

  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "parent.login_enabled",
    entityType: "User",
    entityId: authId,
    after: { phone: parent.phone },
  });
  revalidatePath("/admin/students");
  return { ok: true, pin };
}
