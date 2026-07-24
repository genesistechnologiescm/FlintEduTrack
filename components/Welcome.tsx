"use client";

import { ArrowRight, BarChart3, BellRing, ClipboardCheck, Clock, Globe, Heart, WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";

const STR = {
  en: {
    brand: "EduTrack",
    byline: "by Flint Technologies",
    // Hero
    hook: "Every child accounted for, every day.",
    sub: "Teachers mark a class in under a minute, even with no internet. The moment a child is absent, their parent knows. Attendance, grades, fees and wellbeing, all in one calm place.",
    ctaDemo: "See the live demo",
    ctaNation: "or explore the national picture",
    // Truth strip
    truths: [
      { icon: Clock, label: "Under 60 seconds to mark a class" },
      { icon: WifiOff, label: "Works with no internet" },
      { icon: BellRing, label: "Instant parent alerts" },
      { icon: Globe, label: "English & French" },
    ],
    // How it works
    howTitle: "How a school day works on EduTrack",
    steps: [
      { n: "1", h: "The teacher marks the register", p: "Tap the few who are absent. Done in under a minute, online or off. It syncs when the signal returns." },
      { n: "2", h: "The parent knows at once", p: "An alert reaches the parent's phone the moment their child is marked absent. No more finding out days later." },
      { n: "3", h: "The school acts early", p: "Patterns surface before they become crises. Staff decide what to do, with the full picture in front of them." },
    ],
    // Wins
    winsTitle: "What each person gets",
    wins: [
      { icon: ClipboardCheck, tag: "60-second registers", h: "Teachers", p: "Mark attendance in under a minute, even offline. Hours handed back every week." },
      { icon: Heart, tag: "Real-time visibility", h: "Parents", p: "Follow your child's school day as it happens, and hear the instant they're marked absent." },
      { icon: BarChart3, tag: "One clear picture", h: "Schools & the nation", p: "Fees, grades, wellbeing and attendance in one place, plus the first verifiable view across all ten regions." },
    ],
    // Impact band
    impactEyebrow: "The bigger picture",
    impactTitle: "Built for where it matters most",
    impactBody: "In the North-West and South-West, classrooms no foreign platform can reach are being measured for the first time. Real attendance, region by region: the evidence that turns concern into action.",
    impactCta: "See the national picture",
    // Footer
    footerBuilt: "Built in Bamenda, Cameroon",
    footerBrand: "Flint Technologies · EduTrack",
    privacy: "Privacy & Data Protection",
  },
  fr: {
    brand: "EduTrack",
    byline: "par Flint Technologies",
    hook: "Chaque enfant compté, chaque jour.",
    sub: "Les enseignants font l'appel en moins d'une minute, même sans internet. Dès qu'un enfant est absent, son parent le sait. Présences, notes, frais et bien-être, tout au même endroit, apaisé.",
    ctaDemo: "Voir la démo en direct",
    ctaNation: "ou voir la vue nationale",
    truths: [
      { icon: Clock, label: "Moins de 60 secondes pour faire l'appel" },
      { icon: WifiOff, label: "Fonctionne sans internet" },
      { icon: BellRing, label: "Alertes parents instantanées" },
      { icon: Globe, label: "Français et anglais" },
    ],
    howTitle: "Une journée d'école sur EduTrack",
    steps: [
      { n: "1", h: "L'enseignant fait l'appel", p: "Touchez les quelques absents. Terminé en moins d'une minute, avec ou sans réseau. La synchro se fait au retour du signal." },
      { n: "2", h: "Le parent le sait aussitôt", p: "Une alerte arrive sur le téléphone du parent dès que son enfant est marqué absent. Fini l'apprendre des jours plus tard." },
      { n: "3", h: "L'école agit tôt", p: "Les tendances apparaissent avant de devenir des crises. Le personnel décide, avec une vue complète." },
    ],
    winsTitle: "Ce que chacun y gagne",
    wins: [
      { icon: ClipboardCheck, tag: "Appel en 60 secondes", h: "Enseignants", p: "Faites l'appel en moins d'une minute, même hors ligne. Des heures rendues chaque semaine." },
      { icon: Heart, tag: "Visibilité en temps réel", h: "Parents", p: "Suivez la journée de votre enfant en direct, et soyez prévenu à l'instant où il est marqué absent." },
      { icon: BarChart3, tag: "Une image claire", h: "Écoles et nation", p: "Frais, notes, bien-être et présences au même endroit, plus la première vue vérifiable des dix régions." },
    ],
    impactEyebrow: "La vue d'ensemble",
    impactTitle: "Conçu pour là où ça compte le plus",
    impactBody: "Au Nord-Ouest et au Sud-Ouest, des salles de classe qu'aucune plateforme étrangère n'atteint sont mesurées pour la première fois. De vraies présences, région par région : la preuve qui transforme l'inquiétude en action.",
    impactCta: "Voir la vue nationale",
    footerBuilt: "Conçu à Bamenda, Cameroun",
    footerBrand: "Flint Technologies · EduTrack",
    privacy: "Confidentialité et protection des données",
  },
};

export function Welcome() {
  const { locale, setLocale } = useI18n();
  const t = STR[locale];

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[1080px] px-6">
        {/* Top bar */}
        <div className="flex items-center gap-2.5 py-5">
          <span className="text-ink">
            <OriginMark size={22} />
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-primary">{t.brand}</span>
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
          <div className="mb-6 flex items-center gap-2.5 text-white">
            <OriginMark size={34} rings mono />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--et-hero-sub)" }}>
              {t.brand} · {t.byline}
            </span>
          </div>
          <h1 className="max-w-[16ch] font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            {t.hook}
          </h1>
          <p className="mt-5 max-w-[600px] text-lg leading-relaxed" style={{ color: "var(--et-hero-sub)" }}>
            {t.sub}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href="/login" className="et-btn px-7 py-3 text-sm">
              {t.ctaDemo} <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="/national" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white">
              {t.ctaNation} <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>

          {/* Truth strip */}
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-6 sm:grid-cols-4" style={{ borderColor: "rgba(255,255,255,.14)" }}>
            {t.truths.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <Icon size={18} aria-hidden="true" style={{ color: "var(--et-cyan)" }} />
                <span className="text-[13px] leading-tight text-white/90">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-10">
          <h2 className="mb-6 font-display text-2xl font-bold tracking-tight">{t.howTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {t.steps.map((s) => (
              <div key={s.n} className="et-card p-6">
                <span className="grid size-9 place-items-center rounded-full bg-primary font-display text-sm font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.h}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Three wins */}
        <section className="py-4">
          <h2 className="mb-6 font-display text-2xl font-bold tracking-tight">{t.winsTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {t.wins.map(({ icon: Icon, tag, h, p }) => (
              <div key={h} className="et-card p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-blue-bg">
                  <Icon size={20} className="text-primary" aria-hidden="true" />
                </span>
                <span className="mt-4 inline-block rounded-full bg-blue-bg px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                  {tag}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold">{h}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Impact band — the funder / national story, with real weight */}
        <section className="et-hero et-pop my-10 overflow-hidden px-7 py-12 text-white sm:px-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--et-cyan)" }}>
            {t.impactEyebrow}
          </p>
          <h2 className="mt-3 max-w-[18ch] font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t.impactTitle}
          </h2>
          <p className="mt-4 max-w-[660px] text-lg leading-relaxed" style={{ color: "var(--et-hero-sub)" }}>
            {t.impactBody}
          </p>
          <a
            href="/national"
            className="mt-7 inline-flex items-center gap-1.5 rounded-xl border px-6 py-3 text-sm font-medium text-white"
            style={{ borderColor: "rgba(255,255,255,.24)" }}
          >
            {t.impactCta} <ArrowRight size={16} aria-hidden="true" />
          </a>
        </section>

        {/* Footer */}
        <footer className="mt-4 flex flex-col items-center gap-1.5 border-t border-line py-8 text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-muted">{t.footerBuilt}</span>
          <span className="font-mono text-xs uppercase tracking-widest text-muted">{t.footerBrand}</span>
          <a href="/privacy" className="mt-1 font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            {t.privacy}
          </a>
        </footer>
      </div>
    </main>
  );
}
