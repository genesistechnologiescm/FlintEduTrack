"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { formatWat, isOnTime, watTodayISO } from "@/lib/gate";

// One timestamped arrival tap per staff member per day. Idempotent: a second
// tap returns the first record instead of failing.
export async function checkInAtGate(): Promise<{ ok: boolean; time?: string; onTime?: boolean; already?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
  });
  if (!membership) return { ok: false, error: "Not authorized" };

  const date = new Date(watTodayISO());
  const existing = await prisma.gateCheckIn.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
  if (existing) {
    return { ok: true, already: true, time: formatWat(existing.arrivedAt), onTime: isOnTime(existing.arrivedAt) };
  }

  const record = await prisma.gateCheckIn.create({
    data: { schoolId: membership.schoolId, userId: user.id, date },
  });
  await writeAudit({
    schoolId: membership.schoolId,
    actorUserId: user.id,
    action: "gate.checkin",
    entityType: "GateCheckIn",
    entityId: record.id,
    after: { arrivedAt: record.arrivedAt.toISOString(), onTime: isOnTime(record.arrivedAt) },
  });
  revalidatePath("/attendance");
  revalidatePath("/admin");
  return { ok: true, time: formatWat(record.arrivedAt), onTime: isOnTime(record.arrivedAt) };
}
