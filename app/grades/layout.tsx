import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { resolveShellContext } from "@/lib/shell";

// Grades entry is reached by both admins and teachers — the shell resolves the
// viewer's real role so each sees their own persistent nav.
export default async function GradesLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveShellContext();
  if (!ctx) redirect("/login");
  return (
    <AppShell role={ctx.role} scope={ctx.scope} name={ctx.name}>
      {children}
    </AppShell>
  );
}
