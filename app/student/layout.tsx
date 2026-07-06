import { AppShell } from "@/components/AppShell";

// Wraps every /student/* page (home, quiz, tutor) in the responsive shell so the
// nav is always present — desktop sidebar / mobile bottom bar. Student-only group.
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="student">{children}</AppShell>;
}
