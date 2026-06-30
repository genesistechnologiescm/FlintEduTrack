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

const QuestionSchema = z.object({
  prompt: z.string().trim().min(1).max(300),
  options: z.array(z.string().trim().min(1).max(160)).min(2).max(5),
  correctIndex: z.coerce.number().int().min(0).max(4),
});

const QuizSchema = z
  .object({
    subjectId: z.string().uuid(),
    classGroupId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(140),
    questions: z.array(QuestionSchema).min(1).max(30),
  })
  .refine((v) => v.questions.every((q) => q.correctIndex < q.options.length), {
    message: "Correct answer must be one of the options",
    path: ["questions"],
  });

export async function createQuiz(raw: z.infer<typeof QuizSchema>): Promise<{ ok: boolean; error?: string }> {
  const input = QuizSchema.parse(raw);
  const { userId, schoolId } = await staffContext();

  const subject = await prisma.subject.findFirst({ where: { id: input.subjectId, schoolId } });
  if (!subject) return { ok: false, error: "Subject not in your school" };
  if (input.classGroupId) {
    const klass = await prisma.classGroup.findFirst({ where: { id: input.classGroupId, schoolId } });
    if (!klass) return { ok: false, error: "Class not in your school" };
  }

  const quiz = await prisma.quiz.create({
    data: {
      schoolId,
      subjectId: input.subjectId,
      classGroupId: input.classGroupId ?? null,
      title: input.title,
      createdBy: userId,
      questions: {
        create: input.questions.map((q, i) => ({
          order: i + 1,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
        })),
      },
    },
  });
  await writeAudit({
    schoolId,
    actorUserId: userId,
    action: "quiz.created",
    entityType: "Quiz",
    entityId: quiz.id,
    after: { title: input.title, questions: input.questions.length, subject: subject.name },
  });
  revalidatePath("/admin/quizzes");
  return { ok: true };
}

export async function deleteQuiz(id: string): Promise<{ ok: boolean }> {
  const { userId, schoolId } = await staffContext();
  const quiz = await prisma.quiz.findFirst({ where: { id, schoolId, deletedAt: null } });
  if (!quiz) return { ok: false };
  await prisma.quiz.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ schoolId, actorUserId: userId, action: "quiz.deleted", entityType: "Quiz", entityId: id });
  revalidatePath("/admin/quizzes");
  return { ok: true };
}
