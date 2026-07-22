"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/adminScope";
import { ensureCurrentYear } from "@/lib/academicYear";
import { computeOverdue } from "@/lib/overdue";
import { getStudentBalance } from "@/lib/feeBalance";
import { pickPaidChannel, deliver } from "@/lib/notifications/router";
import { sendWebPush } from "@/lib/notifications/sendWebPush";

// Scoped authorization — see lib/adminScope.ts.
async function adminContext() {
  return requireAdmin("FINANCE");
}

const FeeSchema = z.object({
  label: z.string().trim().min(1).max(80),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  classGroupId: z.string().uuid().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function addFeeItem(raw: z.infer<typeof FeeSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = FeeSchema.parse(raw);
  const { userId, schoolId } = await adminContext();
  const year = await ensureCurrentYear(schoolId);
  const term = await prisma.term.findFirst({ where: { academicYearId: year.id }, orderBy: { order: "asc" } });
  if (!term) return { ok: false, error: "No academic term set up" };

  if (input.classGroupId) {
    const klass = await prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } });
    if (!klass) return { ok: false, error: "Class not in your school" };
  }

  const fee = await prisma.feeItem.create({
    data: {
      schoolId,
      termId: term.id,
      classGroupId: input.classGroupId ?? null,
      label: input.label,
      amount: input.amount,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdBy: userId,
    },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "fee.created",
    entityType: "FeeItem",
    entityId: fee.id,
    after: { label: input.label, amount: input.amount, classGroupId: input.classGroupId ?? null },
  });
  revalidatePath("/admin/fees");
  revalidatePath("/parent/fees");
  return { ok: true };
}

// Mock "bulk fee reminders" (Phase-2 spec) — one reminder per overdue student's
// alert-receiving parents, routed on each parent's cheapest channel (Router v2).
// Idempotent per (parent, student, day) so re-clicking never double-sends.
export async function sendOverdueReminders(): Promise<{ ok: boolean; reminded: number; costFcfa: number; error?: string }> {
  const { userId, schoolId } = await adminContext();
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const overdue = await computeOverdue(schoolId);
  if (overdue.length === 0) return { ok: true, reminded: 0, costFcfa: 0 };

  const today = new Date().toISOString().slice(0, 10);
  let reminded = 0;
  let costFcfa = 0;

  for (const row of overdue) {
    const links = await prisma.parentLink.findMany({
      where: { studentId: row.studentId, schoolId, status: "active", receivesAlerts: true },
      include: { parent: true },
    });
    for (const link of links) {
      const idempotencyKey = `${link.parentUserId}:${row.studentId}:${today}:feeReminder`;
      const exists = await prisma.notificationLog.findUnique({ where: { idempotencyKey } });
      if (exists) continue;

      const body =
        link.parent.preferredLang === "FR"
          ? `EduTrack : rappel — solde de scolarité de ${row.overdueAmount} FCFA en retard pour votre enfant. Payez via MoMo dans EduTrack. — ${school?.name ?? "votre école"}`
          : `EduTrack: reminder — school fees of ${row.overdueAmount} FCFA are overdue for your child. Pay via MoMo in EduTrack. — ${school?.name ?? "your school"}`;

      const push = await prisma.parentChannel.findFirst({
        where: { parentUserId: link.parentUserId, type: "PUSH", optedIn: true },
      });
      const channel = pickPaidChannel(link.parent.contactCapability, !!push);
      let providerMsgId: string | null = null;
      let cost = 0;
      if (channel) {
        const res = await deliver(channel, link.parent.phone, body);
        providerMsgId = res.providerMsgId;
        cost = res.costFcfa;
        costFcfa += cost;
      }
      await prisma.notificationLog.create({
        data: {
          parentUserId: link.parentUserId,
          studentId: row.studentId,
          eventType: "FEE_OVERDUE_REMINDER",
          criticality: "ROUTINE",
          channelAttempted: channel ?? "PUSH",
          channelSucceeded: channel ?? "PUSH",
          costFcfa: cost,
          idempotencyKey,
          deliveryStatus: "SENT",
          providerMsgId,
        },
      });
      if (push) {
        try {
          await sendWebPush(JSON.parse(push.address), { title: "EduTrack", body, url: "/parent/fees" });
        } catch {
          // best-effort
        }
      }
      reminded++;
    }
  }

  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "fees.reminders_sent",
    entityType: "School",
    entityId: schoolId,
    after: { reminded, costFcfa, students: overdue.length },
  });
  revalidatePath("/admin/fees");
  return { ok: true, reminded, costFcfa };
}

const RecordSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  method: z.enum(["CASH", "MOMO", "WAIVER"]),
  reference: z.string().trim().max(40).optional(),
  note: z.string().trim().max(200).optional(),
});

// Bursar records a payment taken at the office (cash counted, or a MoMo
// transaction the parent completed in person), OR grants a WAIVER — a
// scholarship/hardship break that reduces what the student owes without any
// cash changing hands. Waivers are excluded from "collected" but still lower
// the balance and overdue. paidByUserId is the STAFF member either way.
// A missing reference is auto-issued so every entry is traceable to a receipt.
export async function recordPayment(
  raw: z.infer<typeof RecordSchema>,
): Promise<{ ok: boolean; paymentId?: string; reference?: string; newBalance?: number; error?: string }> {
  const input = RecordSchema.parse(raw);
  const { userId, schoolId } = await adminContext();

  // A waiver forgives money — it must carry a reason for the audit trail.
  if (input.method === "WAIVER" && !input.note) {
    return { ok: false, error: "A waiver needs a reason" };
  }

  // Only against a student actively enrolled in THIS school.
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: input.studentId, schoolId, status: "ACTIVE" },
  });
  if (!enrollment) return { ok: false, error: "That student is not enrolled in your school" };

  const reference =
    input.reference && input.reference.length > 0
      ? input.reference
      : `${input.method}-${randomBytes(4).toString("hex").toUpperCase()}`;

  const payment = await prisma.payment.create({
    data: {
      schoolId,
      studentId: input.studentId,
      amount: input.amount,
      method: input.method,
      reference,
      paidByUserId: userId,
      note: input.note || "Recorded at office",
    },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: input.method === "WAIVER" ? "fee.waiver_granted" : "payment.recorded_office",
    entityType: "Payment",
    entityId: payment.id,
    after: { studentId: input.studentId, amount: input.amount, method: input.method, reference },
  });

  const { balance } = await getStudentBalance(input.studentId);
  revalidatePath("/admin/fees");
  revalidatePath("/parent/fees");
  return { ok: true, paymentId: payment.id, reference, newBalance: balance };
}

export async function deleteFeeItem(id: string): Promise<{ ok: boolean }> {
  const { userId, schoolId } = await adminContext();
  const fee = await prisma.feeItem.findFirst({ where: { id, schoolId, deletedAt: null } });
  if (!fee) return { ok: false };
  await prisma.feeItem.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ schoolId, actorUserId: userId, action: "fee.deleted", entityType: "FeeItem", entityId: id });
  revalidatePath("/admin/fees");
  revalidatePath("/parent/fees");
  return { ok: true };
}
