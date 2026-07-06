import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ShellRole, AdminScope } from "@/components/AppShell";

export type ShellContext = { role: ShellRole; scope: AdminScope | null };

// Resolves the signed-in viewer's role for the app shell nav. Staff membership
// (admin/teacher) wins over parent/student so the nav always matches what the
// person can actually do — e.g. a teacher who opens /admin/quizzes still gets
// the teacher nav. Returns null when nobody is signed in (caller redirects).
export async function resolveShellContext(): Promise<ShellContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const staff = await prisma.schoolMembership.findFirst({
    where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
    orderBy: { role: "asc" }, // ADMIN sorts before TEACHER — admin membership wins
  });
  if (staff) {
    return {
      role: staff.role === "ADMIN" ? "admin" : "teacher",
      scope: (staff.adminScope as AdminScope | null) ?? null,
    };
  }

  // Students authenticate with studentAccount.id === auth user id.
  const student = await prisma.studentAccount.findUnique({ where: { id: user.id }, select: { id: true } });
  if (student) return { role: "student", scope: null };

  return { role: "parent", scope: null };
}
