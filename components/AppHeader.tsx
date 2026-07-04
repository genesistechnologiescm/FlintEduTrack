"use client";

import { LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { signOut } from "@/app/login/actions";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";

// Shared top bar for every signed-in screen: brand · theme · language · (avatar/logout).
export function AppHeader({
  avatar,
  logout = false,
}: {
  avatar?: { initials: string; color?: string };
  logout?: boolean;
}) {
  const { locale, setLocale } = useI18n();
  return (
    <header className="flex items-center gap-2 px-4 pb-1 pt-4">
      <span className="text-ink">
        <OriginMark size={20} />
      </span>
      <span className="font-display text-[15px] font-semibold">EduTrack</span>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="flex overflow-hidden rounded-full border border-line text-xs">
          {(["en", "fr"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
              className={`px-2.5 py-1.5 ${locale === l ? "bg-primary text-white" : "text-muted"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {logout && (
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="Sign out"
            className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        )}
        {avatar && (
          <span
            className="grid size-9 place-items-center rounded-full text-[13px] font-semibold text-white"
            style={{ background: avatar.color ?? "var(--et-primary)" }}
          >
            {avatar.initials}
          </span>
        )}
      </div>
    </header>
  );
}
