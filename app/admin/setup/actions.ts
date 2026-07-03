"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { ensureCurrentYear } from "@/lib/academicYear";

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

// ── Assessment components (CA configuration) ────────────────────────────────
const ComponentSchema = z.object({
  name: z.string().trim().min(1).max(60),
  weight: z.coerce.number().int().min(1).max(100),
});

export async function addComponent(raw: z.infer<typeof ComponentSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = ComponentSchema.parse(raw);
  const { userId, schoolId } = await adminContext();

  const existing = await prisma.assessmentComponent.findMany({ where: { schoolId, deletedAt: null } });
  const sum = existing.reduce((n, c) => n + c.weight, 0);
  if (sum + input.weight > 100) {
    return { ok: false, error: `Weights would total ${sum + input.weight}% — they must not exceed 100%` };
  }

  const component = await prisma.assessmentComponent.create({
    data: { schoolId, name: input.name, weight: input.weight, order: existing.length + 1 },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "assessment.component_added",
    entityType: "AssessmentComponent",
    entityId: component.id,
    after: { name: input.name, weight: input.weight },
  });
  revalidatePath("/admin/setup");
  revalidatePath("/grades");
  return { ok: true };
}

export async function deleteComponent(id: string): Promise<{ ok: boolean }> {
  const { userId, schoolId } = await adminContext();
  const component = await prisma.assessmentComponent.findFirst({ where: { id, schoolId, deletedAt: null } });
  if (!component) return { ok: false };
  await prisma.assessmentComponent.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "assessment.component_removed",
    entityType: "AssessmentComponent",
    entityId: id,
    before: { name: component.name, weight: component.weight },
  });
  revalidatePath("/admin/setup");
  revalidatePath("/grades");
  return { ok: true };
}

const STREAMS = ["SCIENCES", "ARTS", "COMMERCIAL", "TECHNICAL"] as const;

const ClassSchema = z.object({
  name: z.string().trim().min(1).max(40),
  formLevel: z.coerce.number().int().min(1).max(7), // 1–5 = Form, 6 = Lower Sixth, 7 = Upper Sixth
  streamType: z.enum(STREAMS).optional(),
});

export async function addClass(raw: z.infer<typeof ClassSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = ClassSchema.parse(raw);
  const { userId, schoolId } = await adminContext();
  const year = await ensureCurrentYear(schoolId);

  const dup = await prisma.classGroup.findFirst({ where: { schoolId, name: input.name, deletedAt: null } });
  if (dup) return { ok: false, error: "A class with that name already exists" };

  const klass = await prisma.classGroup.create({
    data: {
      schoolId,
      academicYearId: year.id,
      name: input.name,
      formLevel: input.formLevel,
      streamType: input.streamType ?? null,
    },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "class.created",
    entityType: "ClassGroup",
    entityId: klass.id,
    after: { name: input.name, formLevel: input.formLevel, stream: input.streamType ?? null },
  });
  revalidatePath("/admin/setup");
  return { ok: true };
}

const SubjectSchema = z.object({
  name: z.string().trim().min(1).max(60),
  code: z.string().trim().max(12).optional(),
  streamType: z.enum(STREAMS).optional(),
});

export async function addSubject(raw: z.infer<typeof SubjectSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = SubjectSchema.parse(raw);
  const { userId, schoolId } = await adminContext();

  try {
    const subject = await prisma.subject.create({
      data: {
        schoolId,
        name: input.name,
        code: input.code || null,
        streamType: input.streamType ?? null,
      },
    });
    await writeAudit({
      schoolId,
      actorUserId: userId,
      action: "subject.created",
      entityType: "Subject",
      entityId: subject.id,
      after: { name: input.name, code: input.code ?? null },
    });
  } catch {
    return { ok: false, error: "A subject with that name already exists" };
  }
  revalidatePath("/admin/setup");
  return { ok: true };
}
