import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Writes an immutable audit row. Best-effort: a logging failure must never break
// the user action — but every grade/attendance/welfare/auth mutation should call
// this (Non-Negotiable Rule 13: government auditability).
export async function writeAudit(entry: {
  schoolId?: string | null;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  after?: Prisma.InputJsonValue;
  reason?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        schoolId: entry.schoolId ?? null,
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        after: entry.after,
        reason: entry.reason,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("audit write failed:", e);
  }
}
