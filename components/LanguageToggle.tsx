"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const other = locale === "en" ? "fr" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(other)}
      aria-label={`Switch language to ${other === "fr" ? "French" : "English"}`}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-black/10 px-4 font-mono text-xs uppercase tracking-widest text-flint-blue transition-colors hover:bg-flint-blue/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flint-blue"
    >
      {t("switchTo")}
    </button>
  );
}
