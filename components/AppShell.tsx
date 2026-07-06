"use client";

import { usePathname } from "next/navigation";
import {
  BookOpen, ClipboardCheck, FileText, Heart, Home, LayoutDashboard, LogOut,
  MessageCircle, Sparkles, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { signOut } from "@/app/login/actions";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";

type NavItem = { href: string; label: string; icon: LucideIcon };
export type ShellRole = "parent" | "student" | "admin" | "teacher";
export type AdminScope = "FULL" | "FINANCE" | "WELFARE";

// Responsive shell shared by every signed-in page: a left sidebar on desktop, a
// bottom bar on mobile. The nav follows the viewer's ROLE (not the URL) so it is
// always correct — e.g. a teacher on /admin/quizzes still sees the teacher nav,
// and Home is one tap/click away from any sub-page. Admin nav is scope-aware so
// a FINANCE/WELFARE admin only sees links they can actually open.
export function AppShell({
  role,
  scope,
  children,
}: {
  role: ShellRole;
  scope?: AdminScope | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const active = (href: string) => pathname === href;
  function buildNav(): NavItem[] {
    switch (role) {
      case "parent":
        return [
          { href: "/parent", label: t("navHome"), icon: Home },
          { href: "/parent/messages", label: t("navMessages"), icon: MessageCircle },
          { href: "/parent/fees", label: t("navFees"), icon: Wallet },
          { href: "/parent/resources", label: t("navResources"), icon: BookOpen },
        ];
      case "student":
        return [
          { href: "/student", label: t("navHome"), icon: Home },
          { href: "/library", label: t("navLibrary"), icon: BookOpen },
          { href: "/student/tutor", label: t("navChariot"), icon: Sparkles },
        ];
      case "teacher":
        return [
          { href: "/attendance", label: t("navToday"), icon: ClipboardCheck },
          { href: "/grades", label: t("navGrades"), icon: FileText },
          { href: "/library", label: t("navLibrary"), icon: BookOpen },
          { href: "/wellbeing", label: t("navWellbeing"), icon: Heart },
        ];
      case "admin": {
        const items: NavItem[] = [
          { href: "/admin", label: t("navHome"), icon: LayoutDashboard },
          { href: "/admin/students", label: t("navStudents"), icon: Users },
        ];
        if (scope === "FULL" || scope === "FINANCE") items.push({ href: "/admin/fees", label: t("navFees"), icon: Wallet });
        if (scope === "FULL" || scope === "WELFARE") items.push({ href: "/admin/welfare", label: t("navWelfare"), icon: Heart });
        return items;
      }
    }
  }
  const nav = buildNav();

  const chrome = (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <div className="flex overflow-hidden rounded-full border border-line text-xs">
        {(["en", "fr"] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLocale(l)} aria-pressed={locale === l}
            className={`px-2.5 py-1.5 ${locale === l ? "bg-primary text-white" : "text-muted"}`}>{l.toUpperCase()}</button>
        ))}
      </div>
      <button type="button" onClick={() => signOut()} aria-label="Sign out" className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line">
        <LogOut size={18} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div className="lg:flex">
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:flex-col lg:border-r lg:border-line lg:bg-surface lg:p-4">
        <div className="mb-6 flex items-center gap-2 px-2 pt-1 text-ink">
          <OriginMark size={22} />
          <span className="font-display text-lg font-semibold">EduTrack</span>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((it) => {
            const Icon = it.icon;
            const on = active(it.href);
            return (
              <a key={it.href} href={it.href} aria-current={on ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${on ? "bg-blue-bg text-primary" : "text-sub hover:bg-chip"}`}>
                <Icon size={20} aria-hidden="true" />
                {it.label}
              </a>
            );
          })}
        </nav>
        <div className="mt-auto px-1 pt-4">{chrome}</div>
      </aside>

      <div className="min-h-dvh flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg px-4 py-3 lg:hidden">
          <span className="text-ink"><OriginMark size={20} /></span>
          <span className="font-display text-[15px] font-semibold">EduTrack</span>
          <div className="ml-auto">{chrome}</div>
        </header>
        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4 lg:max-w-3xl lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <nav className="et-nav">
          {nav.map((it) => {
            const Icon = it.icon;
            return (
              <a key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined} className="et-nav-item">
                <Icon size={22} aria-hidden="true" />
                <span>{it.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
