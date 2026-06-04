"use client";

import { signOut } from "@/app/login/actions";
import { useI18n } from "@/lib/i18n/LanguageProvider";

export function LogoutButton() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-muted hover:text-flint-black"
    >
      {t("logout")}
    </button>
  );
}
