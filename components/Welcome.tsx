"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";

export function Welcome() {
  const { t } = useI18n();

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-[420px] text-center">
        <div className="flex justify-center">
          <LanguageToggle />
        </div>

        <div className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-flint-blue">
          <span className="inline-block size-2 rounded-full bg-flint-cyan" />
          {t("brand")}
        </div>

        <h1 className="mt-4 font-display text-4xl font-bold text-flint-black">
          {t("appName")}
        </h1>
        <p className="mt-2 font-display text-lg text-flint-blue">{t("tagline")}</p>
        <p className="mt-3 text-muted">{t("foundationReady")}</p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 font-mono text-xs text-success">
          <span className="inline-block size-2 rounded-full bg-success" />
          {t("status")}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <a
            href="/attendance"
            className="inline-flex min-h-12 items-center rounded-full bg-flint-blue px-7 font-mono text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("markCta")} →
          </a>
          <a
            href="/admin"
            className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline"
          >
            {t("adminCta")}
          </a>
        </div>
      </div>
    </main>
  );
}
