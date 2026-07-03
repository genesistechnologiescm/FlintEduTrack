"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

async function staffContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const m = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
  });
  if (!m) throw new Error("Not authorized");
  return { userId: user.id, schoolId: m.schoolId, role: m.role };
}

const AddSchema = z.object({
  classGroupId: z.string().uuid(),
  body: z.string().trim().min(3).max(2000),
  activeUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function addHandover(raw: z.infer<typeof AddSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = AddSchema.parse(raw);
  const { userId, schoolId } = await staffContext();

  const klass = await prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } });
  if (!klass) return { ok: false, error: "Class not in your school" };
  const until = new Date(input.activeUntil);
  if (until < new Date(new Date().toISOString().slice(0, 10))) {
    return { ok: false, error: "The cover date must be today or later" };
  }

  const note = await prisma.handoverNote.create({
    data: { schoolId, classGroupId: klass.id, body: input.body, activeUntil: until, authorUserId: userId },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "handover.left",
    entityType: "HandoverNote",
    entityId: note.id,
    after: { class: klass.name, until: input.activeUntil },
  });
  revalidatePath("/handover");
  revalidatePath("/attendance");
  return { ok: true };
}

// The author may withdraw their own note; an admin may remove any.
export async function deleteHandover(id: string): Promise<{ ok: boolean; error?: string }> {
  const { userId, schoolId, role } = await staffContext();
  const note = await prisma.handoverNote.findFirst({ where: { id, schoolId, deletedAt: null } });
  if (!note) return { ok: false, error: "Note not found" };
  if (note.authorUserId !== userId && role !== "ADMIN") return { ok: false, error: "Only the author or an admin can remove it" };

  await prisma.handoverNote.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ schoolId, actorUserId: userId, action: "handover.removed", entityType: "HandoverNote", entityId: id });
  revalidatePath("/handover");
  revalidatePath("/attendance");
  return { ok: true };
}
