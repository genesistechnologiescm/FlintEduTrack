import { AppShell } from "@/components/AppShell";

// Wraps every /parent/* page in the responsive shell (desktop sidebar / mobile
// bottom nav) so navigation is always present, on the home page and every sub-page.
export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell section="parent">{children}</AppShell>;
}
