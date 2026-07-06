import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { resolveShellContext } from "@/lib/shell";

// Wraps every /admin/* page in the responsive shell. Nav is resolved from the
// viewer's real role: admins get the (scope-aware) admin nav, while teachers who
// open shared pages like /admin/resources or /admin/quizzes get the teacher nav
// instead of a set of admin links that would just bounce them to /login.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveShellContext();
  if (!ctx) redirect("/login");
  return (
    <AppShell role={ctx.role} scope={ctx.scope}>
      {children}
    </AppShell>
  );
}
