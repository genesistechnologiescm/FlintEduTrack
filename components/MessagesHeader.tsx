"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/dictionary";
import { signOut } from "@/app/login/actions";
import { ThemeToggle } from "./ThemeToggle";

// Shared top bar for sub-pages: back arrow · title · theme · language · (logout).
export function MessagesHeader({
  backHref,
  parent,
  titleKey = "messagesNav",
}: {
  backHref: string;
  parent?: boolean;
  titleKey?: MessageKey;
}) {
  const { t, locale, setLocale } = useI18n();
  return (
    <header className="mb-4 flex items-center gap-2 pt-4">
      <a href={backHref} aria-label={t("backDash")} className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line">
        <ArrowLeft size={18} aria-hidden="true" />
      </a>
      <span className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{t(titleKey)}</span>
      <ThemeToggle />
      <div className="flex overflow-hidden rounded-full border border-line text-xs">
        {(["en", "fr"] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLocale(l)} aria-pressed={locale === l}
            className={`px-2.5 py-1.5 ${locale === l ? "bg-primary text-white" : "text-muted"}`}>{l.toUpperCase()}</button>
        ))}
      </div>
      {parent && (
        <button type="button" onClick={() => signOut()} aria-label="Sign out" className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line">
          <LogOut size={18} aria-hidden="true" />
        </button>
      )}
    </header>
  );
}
