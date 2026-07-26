"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

// Route-level error boundary. Instead of a broken screen, a real user gets a
// calm, recoverable page. The error is logged (captured in production logs);
// when Sentry is configured this is where captureException would also go.
const STR = {
  en: {
    title: "Something went wrong",
    body: "Sorry, that didn't work. Please try again. If it keeps happening, ask your school to let us know.",
    retry: "Try again",
    home: "Go home",
  },
  fr: {
    title: "Une erreur est survenue",
    body: "Désolé, cela n'a pas fonctionné. Veuillez réessayer. Si le problème persiste, demandez à votre école de nous prévenir.",
    retry: "Réessayer",
    home: "Accueil",
  },
};

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [locale, setLocale] = useState<"en" | "fr">("en");

  useEffect(() => {
    console.error("[app error]", error);
    if (document.documentElement.lang === "fr") setLocale("fr");
  }, [error]);

  const t = STR[locale];

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-ink">
      <div className="et-card max-w-md p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle size={24} aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-sub">{t.body}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="et-btn min-h-11 px-6 text-sm">
            {t.retry}
          </button>
          <a href="/" className="inline-flex min-h-11 items-center rounded-xl border border-line px-6 text-sm font-medium text-ink hover:bg-surface">
            {t.home}
          </a>
        </div>
      </div>
    </main>
  );
}
