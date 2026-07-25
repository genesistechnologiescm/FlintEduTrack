"use client";

import { BarChart3, BellRing, ClipboardCheck, Clock, Globe, Heart, Mail, MessageCircle, Phone, WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";

const STR = {
  en: {
    brand: "EduTrack",
    byline: "by Flint Technologies",
    // Hero
    hook: "Know your child's school day.",
    sub: "Attendance, alerts, grades and fees, all in one place.",
    ctaSignIn: "Sign in",
    heroHelper: "Use the phone number and PIN your school gave you.",
    ctaForSchools: "For schools",
    heroAsk: "Your school not on EduTrack yet? Ask us to bring it.",
    askMsg: "Hi Flint, I'd love EduTrack at my child's school. My school is: ",
    // Contact section
    contactTitle: "Get your school on EduTrack",
    contactSub: "We're onboarding schools across Bamenda and the North-West. Reach out and we'll set your school up, class registers, parent alerts and all.",
    contactEmail: "Email us",
    contactWhatsapp: "Chat on WhatsApp",
    contactCall: "Call us",
    contactSignedUp: "Already on EduTrack?",
    careTitle: "It takes a whole community.",
    careSub: "Parents, teachers and the wider community, all looking out for one child.",
    careAlt: "A community of parents, teachers and neighbours gathered protectively around one child.",
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
    hook: "Suivez la journée d'école de votre enfant.",
    sub: "Présences, alertes, notes et frais, au même endroit.",
    ctaSignIn: "Se connecter",
    heroHelper: "Utilisez le numéro de téléphone et le PIN donnés par votre école.",
    ctaForSchools: "Pour les écoles",
    heroAsk: "Votre école n'est pas encore sur EduTrack ? Demandez-nous de l'y amener.",
    askMsg: "Bonjour Flint, j'aimerais EduTrack dans l'école de mon enfant. Mon école est : ",
    // Contact section
    contactTitle: "Mettez votre école sur EduTrack",
    contactSub: "Nous intégrons les écoles de Bamenda et du Nord-Ouest. Contactez-nous et nous configurons votre école, listes de présence, alertes aux parents, et tout le reste.",
    contactEmail: "Écrivez-nous",
    contactWhatsapp: "Discuter sur WhatsApp",
    contactCall: "Appelez-nous",
    contactSignedUp: "Déjà sur EduTrack ?",
    careTitle: "Il faut toute une communauté.",
    careSub: "Parents, enseignants et toute la communauté, veillant ensemble sur un enfant.",
    careAlt: "Une communauté de parents, d'enseignants et de voisins réunie de façon protectrice autour d'un enfant.",
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

// A warm, original illustration: a whole community — parents, teacher, elder,
// health worker — gathered around one child, the group cradled inside a soft
// heart. It carries the product's real thesis: every child is held by many.
function CommunityArt({ title }: { title: string }) {
  // One figure = a warm-brown head + a rounded-shoulder body (clothing colour).
  // `tilt` leans a figure toward the child at the centre.
  const Figure = ({ x, headY, r, bodyH, skin, cloth, tilt = 0 }: { x: number; headY: number; r: number; bodyH: number; skin: string; cloth: string; tilt?: number }) => (
    <g transform={tilt ? `rotate(${tilt} ${x} ${headY + bodyH})` : undefined}>
      <rect x={x - (r + 4)} y={headY + r - 2} width={(r + 4) * 2} height={bodyH} rx={r + 4} fill={cloth} />
      <circle cx={x} cy={headY} r={r} fill={skin} />
    </g>
  );

  return (
    <svg viewBox="0 0 340 250" role="img" aria-label={title} className="mx-auto w-full max-w-[420px]">
      <defs>
        <radialGradient id="ca-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f0dcb2" stopOpacity="1" />
          <stop offset="1" stopColor="#f0dcb2" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* two sheltering arcs — the community's care arching over the child */}
      <path d="M56 150 Q170 52 284 150" fill="none" stroke="#a9977a" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <path d="M80 154 Q170 80 260 154" fill="none" stroke="#bcae90" strokeWidth="2.5" strokeLinecap="round" opacity="0.32" />

      {/* the adults, leaning in around the child — drawn back-to-front */}
      <Figure x={170} headY={104} r={15} bodyH={72} skin="#6f4526" cloth="#5f6b7e" />
      <Figure x={122} headY={118} r={14} bodyH={62} skin="#8a5a38" cloth="#7e8a6b" tilt={9} />
      <Figure x={218} headY={118} r={14} bodyH={62} skin="#7a4c2c" cloth="#b0805e" tilt={-9} />
      <Figure x={88} headY={134} r={12} bodyH={50} skin="#9c6a42" cloth="#a89078" tilt={14} />
      <Figure x={252} headY={134} r={12} bodyH={50} skin="#a9784f" cloth="#c6b394" tilt={-14} />

      {/* the one child at the heart of it — glow, halo of care, then the child */}
      <circle cx="170" cy="178" r="52" fill="url(#ca-glow)" />
      <circle cx="170" cy="182" r="42" fill="none" stroke="#d9b877" strokeWidth="2.5" opacity="0.55" />
      <ellipse cx="170" cy="216" rx="30" ry="7" fill="#5f4128" opacity="0.12" />
      <g>
        <rect x={156} y={172} width={28} height={40} rx={14} fill="#d7a24f" />
        <circle cx={170} cy={166} r={13} fill="#8d5a34" />
        <path d="M164 167 q6 5 12 0" stroke="#4a2e1a" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

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
            {/* Always-visible sign-in — where any returning user looks first. */}
            <a href="/login" className="rounded-full border border-primary/40 px-4 py-1.5 text-sm font-medium text-primary hover:bg-blue-bg">
              {t.ctaSignIn}
            </a>
          </div>
        </div>

        {/* Hero */}
        <section className="et-hero et-pop my-4 px-7 py-12 text-white sm:px-12 sm:py-16">
          <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:gap-8">
            {/* Left: message */}
            <div className="min-w-0 flex-1">
              <div className="mb-6 flex items-center gap-2.5 text-white">
                <OriginMark size={34} rings mono />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--et-hero-sub)" }}>
                  {t.brand} · {t.byline}
                </span>
              </div>
              <h1 className="max-w-[16ch] font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                {t.hook}
              </h1>
              <p className="mt-5 max-w-[560px] text-lg leading-relaxed" style={{ color: "var(--et-hero-sub)" }}>
                {t.sub}
              </p>
              <div className="mt-8">
                <div className="flex flex-wrap items-center gap-3">
                  <a href="/login" className="et-btn-light px-8 py-3 text-sm">
                    {t.ctaSignIn}
                  </a>
                  <a href="#contact" className="inline-flex min-h-11 items-center rounded-xl border px-6 text-sm font-medium text-white hover:bg-white/10" style={{ borderColor: "rgba(255,255,255,.4)" }}>
                    {t.ctaForSchools}
                  </a>
                </div>
                <p className="mt-3 text-sm" style={{ color: "var(--et-hero-sub)" }}>
                  {t.heroHelper}
                </p>
                {/* Parent-pull → sales: a parent whose school isn't on EduTrack
                    yet hands Flint a warm, named lead over WhatsApp. */}
                <a
                  href={`https://wa.me/237653158701?text=${encodeURIComponent(t.askMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-white underline-offset-4 hover:underline"
                >
                  {t.heroAsk}
                </a>
              </div>
            </div>

            {/* Right: the heart of it — a whole community holding one child.
                Full-width row on mobile; a fixed 360px column on desktop. */}
            <div className="w-full shrink-0 lg:w-[360px] lg:max-w-[360px]">
              <div
                className="et-pop overflow-hidden rounded-2xl p-5 text-center"
                style={{ background: "linear-gradient(180deg,#faf7f1 0%,#efe9de 100%)", boxShadow: "0 24px 60px rgba(3,16,50,.42)", animationDelay: "0.12s" }}
              >
                <CommunityArt title={t.careAlt} />
                <p className="mt-2 font-display text-[15px] font-semibold" style={{ color: "#1a1330" }}>
                  {t.careTitle}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: "#6a5a52" }}>
                  {t.careSub}
                </p>
              </div>
            </div>
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
          <div className="et-anim grid gap-4 sm:grid-cols-3">
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
          <div className="et-anim grid gap-4 sm:grid-cols-3">
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
          <a href="/national" className="et-btn-light mt-7 px-6 py-3 text-sm">
            {t.impactCta}
          </a>
        </section>

        {/* Contact — how a real school gets on board */}
        <section id="contact" className="et-card my-10 scroll-mt-6 p-7 text-center sm:p-10">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t.contactTitle}</h2>
          <p className="mx-auto mt-3 max-w-[560px] leading-relaxed text-sub">{t.contactSub}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/237653158701" target="_blank" rel="noopener noreferrer" className="et-btn px-6 py-3 text-sm">
              <MessageCircle size={16} aria-hidden="true" /> {t.contactWhatsapp}
            </a>
            <a href="mailto:officialkaisy@gmail.com" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/40 px-6 text-sm font-medium text-primary hover:bg-blue-bg">
              <Mail size={16} aria-hidden="true" /> {t.contactEmail}
            </a>
            <a href="tel:+237653158701" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/40 px-6 text-sm font-medium text-primary hover:bg-blue-bg">
              <Phone size={16} aria-hidden="true" /> +237 653 158 701
            </a>
          </div>
          <p className="mt-5 text-sm text-muted">
            {t.contactSignedUp}{" "}
            <a href="/login" className="font-medium text-primary hover:underline">
              {t.ctaSignIn}
            </a>
          </p>
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
