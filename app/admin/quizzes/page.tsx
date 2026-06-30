import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { QuizManager, type QuizManagerData } from "@/components/QuizManager";

export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
    include: { school: true },
  });
  if (!membership) redirect("/login");
  const schoolId = membership.schoolId;

  const [subjects, classes, quizzes] = await Promise.all([
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.classGroup.findMany({ where: { schoolId, deletedAt: null }, orderBy: [{ formLevel: "asc" }, { name: "asc" }] }),
    prisma.quiz.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true } }, attempts: { select: { score: true } } },
    }),
  ]);

  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const className = new Map(classes.map((c) => [c.id, c.name]));

  const data: QuizManagerData = {
    schoolName: membership.school.name,
    isAdmin: membership.role === "ADMIN",
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
    classes: classes.map((c) => ({ id: c.id, name: c.name })),
    quizzes: quizzes.map((q) => {
      const scores = q.attempts.map((a) => a.score);
      const avg = scores.length ? Math.round(scores.reduce((n, s) => n + s, 0) / scores.length) : null;
      return {
        id: q.id,
        title: q.title,
        subject: subjectName.get(q.subjectId) ?? "—",
        target: q.classGroupId ? className.get(q.classGroupId) ?? null : null,
        questions: q._count.questions,
        attempts: scores.length,
        avgScore: avg,
      };
    }),
  };

  return <QuizManager data={data} />;
}
