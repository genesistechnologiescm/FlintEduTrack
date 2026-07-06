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

const ROLE_KEY = {
  parent: "roleParent",
  student: "roleStudent",
  teacher: "roleTeacher",
  admin: "roleAdmin",
} as const;

// "Mrs. Ngwa Comfort" → "NC" (skip honorifics so initials are the real name)
function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const parts = words.filter((w) => !/^(mr|mrs|ms|dr|prof|sir)\.?$/i.test(w));
  const base = parts.length > 0 ? parts : words;
  return base.slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";
}

// Responsive shell shared by every signed-in page: a refined left sidebar on
// desktop (brand, nav, theme/language, user identity card), a frosted top bar +
// M3-style bottom nav on mobile. The nav follows the viewer's ROLE (not the
// URL) so it is always correct, and admin nav is scope-aware so a FINANCE or
// WELFARE admin only sees links they can actually open.
export function AppShell({
  role,
  scope,
  name = "",
  children,
}: {
  role: ShellRole;
  scope?: AdminScope | null;
  name?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const active = (href: string) => pathname === href;
  const roleLabel = t(ROLE_KEY[role]);
  const displayName = name || roleLabel;

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

  const langPill = (
    <div className="flex items-center rounded-full border border-line bg-chip p-0.5 text-[11px] font-semibold">
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`rounded-full px-2.5 py-1 transition-colors ${locale === l ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  const logoutBtn = (
    <button
      type="button"
      onClick={() => signOut()}
      aria-label="Sign out"
      className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink"
    >
      <LogOut size={17} aria-hidden="true" />
    </button>
  );

  return (
    <div className="lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[272px] lg:flex-col lg:border-r lg:border-line lg:bg-surface/70 lg:p-5 lg:backdrop-blur-xl">
        <div className="flex items-center gap-2.5 px-2 pt-1 text-ink">
          <OriginMark size={26} />
          <div className="leading-tight">
            <div className="font-display text-[17px] font-bold tracking-tight">EduTrack</div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted">by Flint</div>
          </div>
        </div>

        <div className="mb-2 mt-8 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{t("navMenu")}</div>
        <nav className="flex flex-col gap-1">
          {nav.map((it) => {
            const Icon = it.icon;
            const on = active(it.href);
            return (
              <a
                key={it.href}
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                  on ? "bg-blue-bg font-semibold text-primary" : "text-sub hover:bg-chip hover:text-ink"
                }`}
              >
                <Icon size={19} aria-hidden="true" />
                {it.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <ThemeToggle />
            {langPill}
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-chip/60 p-3">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
              style={{ backgroundImage: "var(--et-avatar-grad)" }}
            >
              {initialsOf(displayName)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13.5px] font-semibold">{displayName}</div>
              <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">{roleLabel}</div>
            </div>
            {logoutBtn}
          </div>
        </div>
      </aside>

      <div className="min-h-dvh flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <span className="text-ink"><OriginMark size={20} /></span>
          <span className="font-display text-[15px] font-bold tracking-tight">EduTrack</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {langPill}
            {logoutBtn}
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5 lg:max-w-[760px] lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <nav className="et-nav">
          {nav.map((it) => {
            const Icon = it.icon;
            return (
              <a key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined} className="et-nav-item">
                <span className="et-nav-ico"><Icon size={21} aria-hidden="true" /></span>
                <span>{it.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
