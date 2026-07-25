import { prisma } from "@/lib/prisma";

// The home a signed-in user belongs on. Shared by the landing and login pages so
// a returning user is sent straight to their own space instead of the marketing
// page or a second login. Mirrors the login router's priority.
export async function resolveHome(userId: string): Promise<string> {
  const [me, membership] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isGovernment: true, isFlintAdmin: true } }),
    prisma.schoolMembership.findFirst({ where: { userId, status: "active" }, orderBy: { role: "asc" } }),
  ]);
  if (me?.isGovernment) return "/government";
  if (membership?.role === "ADMIN") return "/admin";
  if (membership?.role === "TEACHER") return "/attendance";
  if (me?.isFlintAdmin) return "/flint";
  const student = await prisma.studentAccount.findUnique({ where: { id: userId }, select: { id: true } });
  return student ? "/student" : "/parent";
}
