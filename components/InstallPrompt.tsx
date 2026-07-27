"use client";

import { useEffect, useState } from "react";
import { ArrowUpFromLine, Check, Download, Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";

// Chrome fires this before showing its own install UI. Not in the standard DOM
// types, so it is declared here.
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "et-install-dismissed";

const STR = {
  en: {
    title: "Install EduTrack on your phone",
    whyAndroid: "Opens like an app, works without internet, and alerts reach you the moment your child is marked absent.",
    whyIos: "On iPhone, alerts only work once EduTrack is on your home screen.",
    install: "Install",
    installing: "Installing…",
    iosStep1: "Tap the Share button at the bottom of Safari",
    iosStep2: "Scroll down and tap Add to Home Screen",
    iosStep3: "Tap Add. EduTrack appears with your other apps.",
    dismiss: "Not now",
    close: "Close",
    done: "Installed. Open EduTrack from your home screen.",
  },
  fr: {
    title: "Installez EduTrack sur votre téléphone",
    whyAndroid: "S'ouvre comme une application, fonctionne sans internet, et les alertes vous parviennent dès que votre enfant est marqué absent.",
    whyIos: "Sur iPhone, les alertes ne fonctionnent qu'une fois EduTrack ajouté à l'écran d'accueil.",
    install: "Installer",
    installing: "Installation…",
    iosStep1: "Touchez le bouton Partager en bas de Safari",
    iosStep2: "Faites défiler et touchez Sur l'écran d'accueil",
    iosStep3: "Touchez Ajouter. EduTrack apparaît avec vos autres applications.",
    dismiss: "Plus tard",
    close: "Fermer",
    done: "Installé. Ouvrez EduTrack depuis votre écran d'accueil.",
  },
};

export function InstallPrompt() {
  const { locale } = useI18n();
  const t = STR[locale as "en" | "fr"] ?? STR.en;

  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already running as an installed app: nothing to offer.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    // iOS gives no install event, so it is detected and shown manual steps.
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream;
    if (ios) {
      setIsIos(true);
      setShow(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep Chrome's own banner from firing, we place our own
      setDeferred(e as InstallEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setShow(false);
    } catch {
      setShow(false);
    } finally {
      setBusy(false);
    }
  }

  if (installed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-ink">
        <Check size={16} className="shrink-0 text-success" aria-hidden="true" />
        {t.done}
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-blue-bg px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Download size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-semibold text-ink">{t.title}</p>
          <p className="mt-0.5 text-sm leading-snug text-sub">{isIos ? t.whyIos : t.whyAndroid}</p>

          {isIos ? (
            <ol className="mt-3 space-y-1.5 text-sm text-ink">
              <li className="flex items-center gap-2">
                <ArrowUpFromLine size={15} className="shrink-0 text-primary" aria-hidden="true" />
                {t.iosStep1}
              </li>
              <li className="flex items-center gap-2">
                <Plus size={15} className="shrink-0 text-primary" aria-hidden="true" />
                {t.iosStep2}
              </li>
              <li className="flex items-center gap-2">
                <Check size={15} className="shrink-0 text-primary" aria-hidden="true" />
                {t.iosStep3}
              </li>
            </ol>
          ) : (
            <button type="button" onClick={install} disabled={busy} className="et-btn mt-3 min-h-11 px-6 text-sm disabled:opacity-60">
              {busy ? t.installing : t.install}
            </button>
          )}

          <button type="button" onClick={dismiss} className="mt-2 block text-xs text-muted hover:text-ink hover:underline">
            {t.dismiss}
          </button>
        </div>
        <button type="button" onClick={dismiss} aria-label={t.close} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-line hover:text-ink">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
