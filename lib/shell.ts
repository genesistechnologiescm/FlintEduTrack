import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demoMode";
import type { ShellRole, AdminScope } from "@/components/AppShell";

export type ShellContext = { role: ShellRole; scope: AdminScope | null; name: string };

// Resolves the signed-in viewer's role + display name for the app shell.
// Staff membership (admin/teacher) wins over parent/student so the nav always
// matches what the person can actually do — e.g. a teacher who opens
// /admin/quizzes still gets the teacher nav. Returns null when nobody is
// signed in (caller redirects).
export async function resolveShellContext(): Promise<ShellContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // A user still on the temporary PIN their school issued can't reach any
  // real screen until they set their own. Enforced here because every
  // authenticated layout resolves through this one function. Relaxed on the
  // demo instance (EDUTRACK_DEMO_MODE) so judges aren't interrupted.
  if (user.user_metadata?.must_change_pin === true && !isDemoMode()) {
    redirect("/set-pin");
  }

  const [staff, me] = await Promise.all([
    prisma.schoolMembership.findFirst({
      where: { userId: user.id, status: "active", role: { in: ["ADMIN", "TEACHER"] } },
      orderBy: { role: "asc" }, // ADMIN sorts before TEACHER — admin membership wins
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true } }),
  ]);
  if (staff) {
    return {
      role: staff.role === "ADMIN" ? "admin" : "teacher",
      scope: (staff.adminScope as AdminScope | null) ?? null,
      name: me?.displayName ?? "",
    };
  }

  // Students authenticate with studentAccount.id === auth user id.
  const student = await prisma.studentAccount.findUnique({
    where: { id: user.id },
    include: { student: { select: { firstName: true, lastName: true } } },
  });
  if (student) {
    return { role: "student", scope: null, name: `${student.student.firstName} ${student.student.lastName}` };
  }

  return { role: "parent", scope: null, name: me?.displayName ?? "" };
}
