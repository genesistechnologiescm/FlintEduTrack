"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { askChariot } from "@/lib/ai/tutor";

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
  if (quiz.dueAt && new Date() > quiz.dueAt) return { ok: false, error: "The deadline for this quiz has passed" };

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

// Engagement telemetry: a student opened a lesson. Deduped per student per day
// (unique constraint) — reach, not click counting. Best-effort, never audited
// (telemetry, not governance) and never blocks the UI.
export async function recordResourceView(resourceId: string): Promise<{ ok: boolean }> {
  const parsed = z.string().uuid().safeParse(resourceId);
  if (!parsed.success) return { ok: false };
  try {
    const { studentId, schoolId } = await studentContext();
    void studentId;
    const resource = await prisma.lessonResource.findFirst({ where: { id: parsed.data, schoolId, deletedAt: null } });
    if (!resource) return { ok: false };
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    await prisma.resourceView.upsert({
      where: {
        resourceId_userId_day: {
          resourceId: parsed.data,
          userId: user.id,
          day: new Date(new Date().toISOString().slice(0, 10)),
        },
      },
      update: {},
      create: { resourceId: parsed.data, userId: user.id, day: new Date(new Date().toISOString().slice(0, 10)) },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// Chariot — student AI study tutor. Gated to logged-in students; per-request bounds
// (≤16 turns, ≤1500 chars each) cap the cost of any one call. Chat is ephemeral —
// nothing is stored. The key lives server-side in lib/ai/tutor.
const ChariotSchema = z.object({
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(1500) }))
    .min(1)
    .max(16),
});

export async function sendToChariot(raw: z.infer<typeof ChariotSchema>): Promise<{ ok: boolean; text?: string; reason?: string }> {
  const input = ChariotSchema.parse(raw);
  await studentContext(); // only an authenticated student may use the tutor
  const res = await askChariot(input.history);
  return res.ok ? { ok: true, text: res.text } : { ok: false, reason: res.reason };
}
