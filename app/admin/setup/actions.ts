"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

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

// Cameroon academic year ≈ September → July, 3 terms, 2 sequences each.
// A fresh school has none, which would block enrolment + timetabling, so the
// first time setup needs a year we provision a sensible default automatically.
export async function ensureCurrentYear(schoolId: string) {
  const existing = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (existing) return existing;

  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1; // month 8 = Sept
  const endYear = startYear + 1;
  const year = await prisma.academicYear.create({
    data: {
      schoolId,
      label: `${startYear}/${endYear}`,
      startDate: new Date(startYear, 8, 1), // 1 Sept
      endDate: new Date(endYear, 6, 31), // 31 Jul
      isCurrent: true,
    },
  });
  await prisma.term.createMany({
    data: [
      { academicYearId: year.id, label: "First Term", order: 1, sequenceCount: 2, startDate: new Date(startYear, 8, 1), endDate: new Date(startYear, 11, 15) },
      { academicYearId: year.id, label: "Second Term", order: 2, sequenceCount: 2, startDate: new Date(endYear, 0, 6), endDate: new Date(endYear, 3, 5) },
      { academicYearId: year.id, label: "Third Term", order: 3, sequenceCount: 2, startDate: new Date(endYear, 3, 20), endDate: new Date(endYear, 6, 15) },
    ],
  });
  return year;
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
