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
  return { userId: user.id, schoolId: m.schoolId };
}

const AddSchema = z
  .object({
    subjectId: z.string().uuid(),
    classGroupId: z.string().uuid().optional(),
    type: z.enum(["LINK", "NOTE"]),
    title: z.string().trim().min(1).max(140),
    url: z.string().trim().url().max(2000).optional(),
    body: z.string().trim().max(8000).optional(),
  })
  .refine((v) => v.type !== "LINK" || (!!v.url && /^https?:\/\//i.test(v.url)), {
    message: "A valid http(s) link is required",
    path: ["url"],
  })
  .refine((v) => v.type !== "NOTE" || (!!v.body && v.body.length > 0), {
    message: "Lesson text is required",
    path: ["body"],
  });

export async function addResource(raw: z.infer<typeof AddSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = AddSchema.parse(raw);
  const { userId, schoolId } = await staffContext();

  const subject = await prisma.subject.findFirst({ where: { id: input.subjectId, schoolId } });
  if (!subject) return { ok: false, error: "Subject not in your school" };
  if (input.classGroupId) {
    const klass = await prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } });
    if (!klass) return { ok: false, error: "Class not in your school" };
  }

  const resource = await prisma.lessonResource.create({
    data: {
      schoolId,
      subjectId: input.subjectId,
      classGroupId: input.classGroupId ?? null,
      type: input.type,
      title: input.title,
      url: input.type === "LINK" ? input.url : null,
      body: input.type === "NOTE" ? input.body : null,
      createdBy: userId,
    },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "resource.added",
    entityType: "LessonResource",
    entityId: resource.id,
    after: { title: input.title, type: input.type, subject: subject.name },
  });
  revalidatePath("/admin/resources");
  revalidatePath("/parent/resources");
  return { ok: true };
}

export async function deleteResource(id: string): Promise<{ ok: boolean }> {
  const { userId, schoolId } = await staffContext();
  const resource = await prisma.lessonResource.findFirst({ where: { id, schoolId, deletedAt: null } });
  if (!resource) return { ok: false };
  await prisma.lessonResource.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "resource.deleted",
    entityType: "LessonResource",
    entityId: id,
  });
  revalidatePath("/admin/resources");
  revalidatePath("/parent/resources");
  return { ok: true };
}
