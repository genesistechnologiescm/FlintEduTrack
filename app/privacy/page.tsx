"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { OriginMark } from "@/components/OriginMark";
import { ThemeToggle } from "@/components/ThemeToggle";

const CONTACT = "officialkaisy@gmail.com";

type Section = { h: string; p: string[] };
type Copy = {
  back: string;
  title: string;
  updated: string;
  intro: string[];
  sections: Section[];
  legalNote: string;
};

const STR: { en: Copy; fr: Copy } = {
  en: {
    back: "Back to home",
    title: "Privacy & Data Protection",
    updated: "Last updated: July 2026",
    intro: [
      "EduTrack is a school platform built by Flint Technologies. It helps schools record attendance, share it with parents, and manage grades, wellbeing and fees.",
      "Your school decides what information is collected and why — it is the data controller. Flint operates the platform on the school's behalf as the data processor. This notice explains, in plain language, what we hold and the choices you have.",
    ],
    sections: [
      {
        h: "What we collect",
        p: [
          "Students: name, class and stream, attendance, grades, and wellbeing notes a teacher records. A date of birth or photo only if the school adds one.",
          "Parents and guardians: name, phone number, and preferred language (English or French).",
          "Staff: name, phone number, and the classes they teach.",
          "We do not collect more than a school needs to run day to day.",
        ],
      },
      {
        h: "Why we collect it",
        p: [
          "To mark attendance and alert you the same day if your child is absent.",
          "To keep grades, report cards, wellbeing notes and fee records for the school.",
          "The lawful basis is the school's task of educating your child and its agreement with you at enrolment.",
        ],
      },
      {
        h: "Children's data",
        p: [
          "Most of the data is about children, so we treat it with extra care. It is used only to support the child's schooling — never sold, never used for advertising.",
        ],
      },
      {
        h: "Who can see it",
        p: [
          "A parent sees only their own children. A teacher sees only their own classes. Fees and wellbeing details are limited to the staff who need them.",
          "Government dashboards show only anonymous totals by region — never a named child.",
          "Access is enforced at the database, not just hidden in the screen, and every change is logged.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "We keep a student's records while they are enrolled and for a reasonable period afterwards so the school can produce transcripts and reports.",
          "When data is no longer needed, it is deleted or anonymised. You can ask for erasure sooner (see your rights below).",
        ],
      },
      {
        h: "Your rights",
        p: [
          "You can ask to see the data held about you or your child, to correct anything wrong, or to have it erased.",
          "To make a request, contact your school, or write to Flint at " + CONTACT + ". We will respond within a reasonable time.",
        ],
      },
      {
        h: "How we protect it",
        p: [
          "Data is encrypted in transit and at rest, access is controlled per role, logins use a private PIN, and every sensitive action is recorded in an audit trail.",
        ],
      },
      {
        h: "Sharing",
        p: [
          "We do not sell your data. We do not share a named child's data with anyone outside your school, except anonymous totals used for regional education planning.",
        ],
      },
      {
        h: "Contact",
        p: [
          "Questions about your data: speak to your school first. You can also reach Flint Technologies at " + CONTACT + ".",
        ],
      },
    ],
    legalNote:
      "This notice is provided in good faith and in plain language. It is not a substitute for formal legal advice; the definitive terms are those agreed with your school.",
  },
  fr: {
    back: "Retour à l'accueil",
    title: "Confidentialité et protection des données",
    updated: "Dernière mise à jour : juillet 2026",
    intro: [
      "EduTrack est une plateforme scolaire développée par Flint Technologies. Elle aide les écoles à enregistrer les présences, à les partager avec les parents, et à gérer les notes, le bien-être et les frais.",
      "Votre école décide quelles informations sont collectées et pourquoi : elle est le responsable du traitement. Flint exploite la plateforme pour le compte de l'école, en tant que sous-traitant. Cette note explique, en langage clair, ce que nous conservons et les choix dont vous disposez.",
    ],
    sections: [
      {
        h: "Ce que nous collectons",
        p: [
          "Élèves : nom, classe et série, présences, notes, et observations de bien-être saisies par un enseignant. Une date de naissance ou une photo uniquement si l'école les ajoute.",
          "Parents et tuteurs : nom, numéro de téléphone et langue préférée (français ou anglais).",
          "Personnel : nom, numéro de téléphone et classes enseignées.",
          "Nous ne collectons rien de plus que ce dont une école a besoin au quotidien.",
        ],
      },
      {
        h: "Pourquoi nous les collectons",
        p: [
          "Pour marquer les présences et vous alerter le jour même si votre enfant est absent.",
          "Pour conserver les notes, les bulletins, les observations de bien-être et les frais pour l'école.",
          "La base légale est la mission de l'école d'instruire votre enfant et l'accord conclu avec vous lors de l'inscription.",
        ],
      },
      {
        h: "Données des enfants",
        p: [
          "La plupart des données concernent des enfants ; nous les traitons donc avec un soin particulier. Elles servent uniquement à accompagner la scolarité de l'enfant, jamais à la vente ni à la publicité.",
        ],
      },
      {
        h: "Qui peut les voir",
        p: [
          "Un parent ne voit que ses propres enfants. Un enseignant ne voit que ses propres classes. Les frais et les détails de bien-être sont réservés au personnel qui en a besoin.",
          "Les tableaux de bord gouvernementaux n'affichent que des totaux anonymes par région, jamais un enfant nommé.",
          "L'accès est contrôlé au niveau de la base de données, pas seulement masqué à l'écran, et chaque modification est journalisée.",
        ],
      },
      {
        h: "Durée de conservation",
        p: [
          "Nous conservons le dossier d'un élève pendant sa scolarité et une période raisonnable ensuite, afin que l'école puisse produire relevés et bulletins.",
          "Lorsque les données ne sont plus nécessaires, elles sont supprimées ou anonymisées. Vous pouvez demander une suppression plus tôt (voir vos droits ci-dessous).",
        ],
      },
      {
        h: "Vos droits",
        p: [
          "Vous pouvez demander à consulter les données vous concernant ou concernant votre enfant, à corriger toute erreur, ou à les faire effacer.",
          "Pour une demande, contactez votre école, ou écrivez à Flint à l'adresse " + CONTACT + ". Nous répondrons dans un délai raisonnable.",
        ],
      },
      {
        h: "Comment nous les protégeons",
        p: [
          "Les données sont chiffrées en transit et au repos, l'accès est contrôlé par rôle, les connexions utilisent un PIN privé, et chaque action sensible est consignée dans un journal d'audit.",
        ],
      },
      {
        h: "Partage",
        p: [
          "Nous ne vendons pas vos données. Nous ne partageons les données d'un enfant nommé avec personne en dehors de votre école, sauf des totaux anonymes utilisés pour la planification régionale de l'éducation.",
        ],
      },
      {
        h: "Contact",
        p: [
          "Pour toute question sur vos données : adressez-vous d'abord à votre école. Vous pouvez aussi contacter Flint Technologies à " + CONTACT + ".",
        ],
      },
    ],
    legalNote:
      "Cette note est fournie de bonne foi et en langage clair. Elle ne remplace pas un avis juridique formel ; les conditions définitives sont celles convenues avec votre école.",
  },
};

export default function PrivacyPage() {
  const { locale, setLocale } = useI18n();
  const t = STR[locale];

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto flex max-w-[760px] flex-col px-6 pb-16">
        <div className="flex items-center gap-2 py-4">
          <a href="/" aria-label={t.back} className="mr-auto grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink">
            <ArrowLeft size={18} aria-hidden="true" />
          </a>
          <ThemeToggle />
          <div className="flex overflow-hidden rounded-full border border-line text-xs">
            {(["en", "fr"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                aria-pressed={locale === l}
                className={`px-3 py-1.5 ${locale === l ? "bg-primary text-white" : "text-muted"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <header className="mb-8 mt-4">
          <div className="mb-4 flex items-center gap-3 text-ink">
            <OriginMark size={40} />
            <span className="grid size-9 place-items-center rounded-full bg-blue-bg text-primary">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted">{t.updated}</p>
        </header>

        {t.intro.map((p, i) => (
          <p key={i} className="mb-3 leading-relaxed text-sub">
            {p}
          </p>
        ))}

        <div className="mt-6 space-y-7">
          {t.sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-2 font-display text-lg font-bold text-ink">{s.h}</h2>
              {s.p.map((p, i) => (
                <p key={i} className="mb-2 leading-relaxed text-sub">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-10 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          {t.legalNote}
        </p>

        <footer className="mt-8 border-t border-line pt-6 font-mono text-xs uppercase tracking-widest text-muted">
          EduTrack · Flint Technologies
        </footer>
      </div>
    </main>
  );
}
