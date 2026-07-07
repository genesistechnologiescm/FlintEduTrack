import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { resolveShellContext } from "@/lib/shell";

// Teacher home. Wrapped in the role-aware shell so the persistent nav (and the
// desktop sidebar instead of a phone layout) is present here too.
export default async function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveShellContext();
  if (!ctx) redirect("/login");
  return (
    <AppShell role={ctx.role} scope={ctx.scope} name={ctx.name}>
      {children}
    </AppShell>
  );
}
