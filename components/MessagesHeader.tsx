"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { LogoutButton } from "./LogoutButton";

export function MessagesHeader({ backHref, parent }: { backHref: string; parent?: boolean }) {
  const { t } = useI18n();
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div>
        <a href={backHref} className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
          ← {parent ? t("parentTitle") : t("backDash")}
        </a>
        <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("messagesNav")}</h1>
      </div>
      <div className="flex flex-col items-end gap-2">
        <LanguageToggle />
        {parent && <LogoutButton />}
      </div>
    </header>
  );
}
