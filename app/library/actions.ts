"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// Any active staff member (teacher or admin) may SUBMIT to the national
// library; nothing appears on the shelf until a Flint curator approves.
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

const SubmitSchema = z
  .object({
    kind: z.enum(["PAST_PAPER", "SYLLABUS", "STUDY_GUIDE"]),
    title: z.string().trim().min(1).max(140),
    subject: z.string().trim().min(1).max(60),
    exam: z.string().trim().max(40).optional(),
    year: z.coerce.number().int().min(1990).max(2100).optional(),
    url: z.string().trim().url().max(2000).optional(),
    body: z.string().trim().max(8000).optional(),
  })
  .refine((v) => !!v.url || !!v.body, { message: "Add a link or write the content", path: ["body"] })
  .refine((v) => !v.url || /^https?:\/\//i.test(v.url), { message: "Link must be http(s)", path: ["url"] });

export async function submitLibraryItem(raw: z.infer<typeof SubmitSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = SubmitSchema.parse(raw);
  const { userId, schoolId } = await staffContext();

  const item = await prisma.libraryItem.create({
    data: {
      kind: input.kind,
      title: input.title,
      subject: input.subject,
      exam: input.exam || null,
      year: input.year ?? null,
      url: input.url || null,
      body: input.body || null,
      status: "PENDING",
      schoolId,
      createdBy: userId,
    },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "library.submitted",
    entityType: "LibraryItem",
    entityId: item.id,
    after: { title: input.title, kind: input.kind, subject: input.subject },
  });
  revalidatePath("/library");
  revalidatePath("/curate");
  return { ok: true };
}
