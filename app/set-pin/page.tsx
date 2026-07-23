"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { changePin } from "./actions";
import { OriginMark } from "@/components/OriginMark";
import { signOut } from "@/app/login/actions";

const STR = {
  en: {
    title: "Choose your PIN",
    sub: "Your school gave you a temporary PIN. Set your own private one to continue — no one else should know it.",
    newPin: "New PIN",
    confirmPin: "Confirm PIN",
    save: "Save PIN",
    saving: "Saving…",
    signOut: "Sign out",
    secured: "Secured by EduTrack · Flint Technologies",
    errors: {
      length: "Enter a 5-digit PIN.",
      mismatch: "The two PINs do not match.",
      repeated: "Too easy to guess — don't use the same digit five times.",
      sequential: "Too easy to guess — don't use a run like 1 2 3 4 5.",
      common: "That PIN is too common. Choose a less obvious one.",
      auth: "Could not save your PIN. Try again.",
    },
  },
  fr: {
    title: "Choisissez votre PIN",
    sub: "Votre école vous a donné un PIN temporaire. Définissez le vôtre pour continuer — personne d'autre ne doit le connaître.",
    newPin: "Nouveau PIN",
    confirmPin: "Confirmer le PIN",
    save: "Enregistrer",
    saving: "Enregistrement…",
    signOut: "Se déconnecter",
    secured: "Sécurisé par EduTrack · Flint Technologies",
    errors: {
      length: "Entrez un PIN à 5 chiffres.",
      mismatch: "Les deux PIN ne correspondent pas.",
      repeated: "Trop facile à deviner — n'utilisez pas cinq fois le même chiffre.",
      sequential: "Trop facile à deviner — évitez une suite comme 1 2 3 4 5.",
      common: "Ce PIN est trop courant. Choisissez-en un moins évident.",
      auth: "Impossible d'enregistrer votre PIN. Réessayez.",
    },
  },
};

export default function SetPinPage() {
  const { locale } = useI18n();
  const t = STR[locale];
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = pin.length === 5 && confirm.length === 5;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || loading) return;
    setError(null);
    setLoading(true);
    const res = await changePin({ pin, confirm });
    if (res && !res.ok) {
      setError(t.errors[res.code]);
      setLoading(false);
    }
    // success → the action redirects to the role home
  }

  const pinField = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div>
      <label htmlFor={id} className="et-label mt-1">
        {label}
      </label>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="new-password"
        maxLength={5}
        value={value}
        onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 5))}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-2xl font-semibold tracking-[0.4em] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--et-blue-bg)]"
      />
    </div>
  );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-ink">
      <div className="w-full max-w-[420px] et-pop">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center text-ink">
            <OriginMark size={56} rings />
          </div>
          <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-blue-bg text-primary">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold">{t.title}</h1>
          <p className="mx-auto mt-2 max-w-[34ch] text-sm text-muted">{t.sub}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {pinField("new-pin", t.newPin, pin, setPin)}
          {pinField("confirm-pin", t.confirmPin, confirm, setConfirm)}

          {error && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" disabled={!valid || loading} className="et-btn w-full py-3.5 text-[15px]">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                {t.saving}
              </>
            ) : (
              <>
                {t.save}
                <ArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <form action={signOut} className="mt-4 text-center">
          <button type="submit" className="text-sm text-muted hover:text-ink hover:underline">
            {t.signOut}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11.5px] text-muted">
          <Lock size={13} aria-hidden="true" />
          {t.secured}
        </div>
      </div>
    </main>
  );
}
