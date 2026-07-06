import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { resolveShellContext } from "@/lib/shell";

// Wraps every /parent/* page in the responsive shell (desktop sidebar / mobile
// bottom nav) so navigation is always present. Role + name resolved server-side
// so the sidebar identity card shows who is signed in.
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveShellContext();
  if (!ctx) redirect("/login");
  return (
    <AppShell role={ctx.role} scope={ctx.scope} name={ctx.name}>
      {children}
    </AppShell>
  );
}
