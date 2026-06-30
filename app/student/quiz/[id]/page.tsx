import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { QuizTaker, type TakerQuestion } from "@/components/QuizTaker";

export const dynamic = "force-dynamic";

export default async function TakeQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const account = await prisma.studentAccount.findUnique({ where: { id: user.id } });
  if (!account) redirect("/login");

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: account.studentId, status: "ACTIVE" },
    orderBy: { enrolledAt: "desc" },
  });

  const quiz = await prisma.quiz.findFirst({
    where: { id, deletedAt: null, schoolId: account.schoolId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  // Must belong to the student's class (or be whole-school).
  if (!quiz || (quiz.classGroupId && quiz.classGroupId !== enrollment?.classGroupId)) redirect("/student");

  const attempt = await prisma.quizAttempt.findUnique({
    where: { quizId_studentId: { quizId: quiz.id, studentId: account.studentId } },
  });

  // Never send correctIndex to the client.
  const questions: TakerQuestion[] = quiz.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: (q.options as string[]) ?? [],
  }));

  return (
    <QuizTaker
      quizId={quiz.id}
      title={quiz.title}
      questions={questions}
      alreadyScore={attempt ? attempt.score : null}
    />
  );
}
