"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// National exam calendar is government-managed: only isGovernment (or the
// Flint super-admin) may write. Schools/parents/students are read-only.
async function governmentContext(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isGovernment: true, isFlintAdmin: true },
  });
  if (!me || (!me.isGovernment && !me.isFlintAdmin)) throw new Error("Not authorized");
  return { userId: user.id };
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

export async function addNationalEvent(raw: z.infer<typeof AddSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = AddSchema.parse(raw);
  const { userId } = await governmentContext();

  const event = await prisma.nationalEvent.create({
    data: {
      title: input.title,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      note: input.note || null,
      createdBy: userId,
    },
  });
  await writeAudit({
    actorUserId: userId,
    action: "national_calendar.event_added",
    entityType: "NationalEvent",
    entityId: event.id,
    after: { title: input.title, startDate: input.startDate, endDate: input.endDate ?? null },
  });
  revalidatePath("/government/calendar");
  revalidatePath("/parent");
  revalidatePath("/student");
  return { ok: true };
}

export async function deleteNationalEvent(id: string): Promise<{ ok: boolean }> {
  const { userId } = await governmentContext();
  const event = await prisma.nationalEvent.findFirst({ where: { id, deletedAt: null } });
  if (!event) return { ok: false };
  await prisma.nationalEvent.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({
    actorUserId: userId,
    action: "national_calendar.event_removed",
    entityType: "NationalEvent",
    entityId: id,
    before: { title: event.title, startDate: event.startDate.toISOString().slice(0, 10) },
  });
  revalidatePath("/government/calendar");
  revalidatePath("/parent");
  revalidatePath("/student");
  return { ok: true };
}
