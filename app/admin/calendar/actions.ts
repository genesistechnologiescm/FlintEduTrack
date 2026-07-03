"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/adminScope";

// Scoped authorization — see lib/adminScope.ts.
async function adminContext() {
  return requireAdmin();
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const AddSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    startDate: dateStr,
    endDate: dateStr.optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export async function addEvent(raw: z.infer<typeof AddSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = AddSchema.parse(raw);
  const { userId, schoolId } = await adminContext();

  const event = await prisma.calendarEvent.create({
    data: {
      schoolId,
      title: input.title,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      note: input.note || null,
      createdBy: userId,
    },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "calendar.event_added",
    entityType: "CalendarEvent",
    entityId: event.id,
    after: { title: input.title, startDate: input.startDate, endDate: input.endDate ?? null },
  });
  revalidatePath("/admin/calendar");
  revalidatePath("/parent");
  revalidatePath("/student");
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<{ ok: boolean }> {
  const { userId, schoolId } = await adminContext();
  const event = await prisma.calendarEvent.findFirst({ where: { id, schoolId, deletedAt: null } });
  if (!event) return { ok: false };
  await prisma.calendarEvent.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "calendar.event_removed",
    entityType: "CalendarEvent",
    entityId: id,
    before: { title: event.title, startDate: event.startDate.toISOString().slice(0, 10) },
  });
  revalidatePath("/admin/calendar");
  revalidatePath("/parent");
  revalidatePath("/student");
  return { ok: true };
}
