"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// Resolve the logged-in student → their Student row + school.
async function studentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const account = await prisma.studentAccount.findUnique({ where: { id: user.id } });
  if (!account) throw new Error("Not a student account");
  return { studentId: account.studentId, schoolId: account.schoolId };
}

const SubmitSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(z.coerce.number().int().min(0).max(4)),
});

// Auto-grade a quiz attempt server-side (answers are graded against the stored
// correctIndex — the client never sees the key). One attempt per student.
export async function submitQuiz(raw: z.infer<typeof SubmitSchema>): Promise<{ ok: boolean; score?: number; correct?: number; total?: number; error?: string }> {
  const input = SubmitSchema.parse(raw);
  const { studentId, schoolId } = await studentContext();

  const quiz = await prisma.quiz.findFirst({
    where: { id: input.quizId, deletedAt: null },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return { ok: false, error: "Quiz not found" };

  const existing = await prisma.quizAttempt.findUnique({ where: { quizId_studentId: { quizId: quiz.id, studentId } } });
  if (existing) return { ok: false, error: "Already submitted" };

  const total = quiz.questions.length;
  let correct = 0;
  quiz.questions.forEach((q, i) => {
    if (input.answers[i] === q.correctIndex) correct++;
  });
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  await prisma.quizAttempt.create({
    data: { quizId: quiz.id, studentId, schoolId, score, answers: input.answers },
  });
  revalidatePath("/student");
  return { ok: true, score, correct, total };
}
