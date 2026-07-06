"use client";

import { ArrowRight, BarChart3, BellRing, ClipboardCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/dictionary";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";

function Win({ icon: Icon, titleKey, bodyKey }: { icon: typeof BellRing; titleKey: MessageKey; bodyKey: MessageKey }) {
  const { t } = useI18n();
  return (
    <div className="et-card p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-blue-bg">
        <Icon size={20} className="text-primary" aria-hidden="true" />
      </span>
      <h3 className="mt-3 font-display text-lg font-semibold">{t(titleKey)}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{t(bodyKey)}</p>
    </div>
  );
}

export function Welcome() {
  const { t, locale, setLocale } = useI18n();

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[1000px] px-6">
        {/* Top bar */}
        <div className="flex items-center gap-2 py-5">
          <span className="text-ink">
            <OriginMark size={20} />
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-primary">{t("brand")}</span>
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
          </div>
        </div>

        {/* Hero */}
        <section className="et-hero et-pop my-4 px-7 py-12 text-white sm:px-12 sm:py-16">
          <div className="mb-5 text-white">
            <OriginMark size={52} rings mono />
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">{t("appName")}</h1>
          <p className="mt-4 max-w-[640px] font-display text-2xl font-semibold leading-tight sm:text-3xl" style={{ color: "#fff" }}>
            {t("landingHook")}
          </p>
          <p className="mt-5 max-w-[600px] text-lg leading-relaxed" style={{ color: "var(--et-hero-sub)" }}>
            {t("landingSub")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/login" className="et-btn px-7 py-3 text-sm">
              {t("landingDemo")} <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a
              href="/national"
              className="inline-flex items-center gap-1.5 rounded-xl border px-6 py-3 text-sm font-medium text-white"
              style={{ borderColor: "rgba(255,255,255,.22)" }}
            >
              {t("natCta")} <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Three wins */}
        <section className="grid gap-4 py-6 sm:grid-cols-3">
          <Win icon={ClipboardCheck} titleKey="landingW1Title" bodyKey="landingW1Body" />
          <Win icon={BellRing} titleKey="landingW2Title" bodyKey="landingW2Body" />
          <Win icon={BarChart3} titleKey="landingW3Title" bodyKey="landingW3Body" />
        </section>

        {/* Crisis-impact callout — the funder hook */}
        <section className="my-6 rounded-2xl p-6 sm:p-8" style={{ background: "var(--et-blue-bg)" }}>
          <h2 className="font-display text-xl font-semibold">{t("landingCrisisTitle")}</h2>
          <p className="mt-2 max-w-[660px] leading-relaxed text-sub">{t("landingCrisisBody")}</p>
        </section>

        {/* Footer */}
        <footer className="mt-4 border-t border-line py-8 text-center font-mono text-xs uppercase tracking-widest text-muted">
          {t("landingFooter")}
        </footer>
      </div>
    </main>
  );
}
