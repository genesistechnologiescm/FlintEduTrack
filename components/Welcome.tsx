"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/dictionary";
import { LanguageToggle } from "./LanguageToggle";

function Win({ titleKey, bodyKey }: { titleKey: MessageKey; bodyKey: MessageKey }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <span className="inline-block size-2 rounded-full bg-flint-cyan" />
      <h3 className="mt-3 font-display text-lg font-bold text-flint-black">{t(titleKey)}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{t(bodyKey)}</p>
    </div>
  );
}

export function Welcome() {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-[920px] px-6">
      {/* Top bar */}
      <div className="flex items-center justify-between py-6">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-flint-blue">
          <span className="size-2 rounded-full bg-flint-cyan" />
          {t("brand")}
        </div>
        <LanguageToggle />
      </div>

      {/* Hero */}
      <section className="py-10 sm:py-16">
        <h1 className="font-display text-5xl font-bold tracking-tight text-flint-black sm:text-6xl">
          {t("appName")}
        </h1>
        <p className="mt-4 max-w-[640px] font-display text-2xl font-semibold leading-tight text-flint-blue sm:text-3xl">
          {t("landingHook")}
        </p>
        <p className="mt-5 max-w-[600px] text-lg leading-relaxed text-muted">
          {t("landingSub")}
        </p>
        <div className="mt-8">
          <a
            href="/login"
            className="inline-flex min-h-12 items-center rounded-full bg-flint-blue px-8 font-mono text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flint-blue"
          >
            {t("landingDemo")} →
          </a>
        </div>
      </section>

      {/* Three wins */}
      <section className="grid gap-4 py-6 sm:grid-cols-3">
        <Win titleKey="landingW1Title" bodyKey="landingW1Body" />
        <Win titleKey="landingW2Title" bodyKey="landingW2Body" />
        <Win titleKey="landingW3Title" bodyKey="landingW3Body" />
      </section>

      {/* Crisis-impact callout — the funder hook */}
      <section className="my-8 rounded-2xl border border-flint-blue/15 bg-flint-blue/5 p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-flint-black">
          {t("landingCrisisTitle")}
        </h2>
        <p className="mt-2 max-w-[660px] leading-relaxed text-muted">
          {t("landingCrisisBody")}
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 py-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
        {t("landingFooter")}
      </footer>
    </main>
  );
}
