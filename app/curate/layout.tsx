import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { resolveShellContext } from "@/lib/shell";

// Library curation is a staff (teacher/admin curator) tool — role resolved by
// the shell so the persistent nav is always correct.
export default async function CurateLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveShellContext();
  if (!ctx) redirect("/login");
  return (
    <AppShell role={ctx.role} scope={ctx.scope} name={ctx.name}>
      {children}
    </AppShell>
  );
}
