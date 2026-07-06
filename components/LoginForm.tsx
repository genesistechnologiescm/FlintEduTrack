"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, GraduationCap, Loader2, Lock, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { signIn, signInStudent } from "@/app/login/actions";
import { OriginMark } from "./OriginMark";
import { ThemeToggle } from "./ThemeToggle";

const STR = {
  en: {
    welcome: "Welcome back",
    sub: "Sign in to your school account",
    acctPhone: "Parent or staff",
    acctStudent: "Student",
    phoneLabel: "Phone number",
    codeLabel: "Student code",
    phonePh: "6XX XXX XXX",
    codePh: "e.g. TAB1234",
    pinLabel: "PIN",
    showPin: "Show PIN",
    hidePin: "Hide PIN",
    signIn: "Sign in",
    signingIn: "Signing in…",
    forgot: "Forgot your PIN?",
    forgotAction: "Ask your school to reset it.",
    secured: "Secured by EduTrack · Flint Technologies",
    backHome: "Back to home",
  },
  fr: {
    welcome: "Bon retour",
    sub: "Connectez-vous à votre compte",
    acctPhone: "Parent ou personnel",
    acctStudent: "Élève",
    phoneLabel: "Numéro de téléphone",
    codeLabel: "Code élève",
    phonePh: "6XX XXX XXX",
    codePh: "ex. TAB1234",
    pinLabel: "Code PIN",
    showPin: "Afficher le PIN",
    hidePin: "Masquer le PIN",
    signIn: "Se connecter",
    signingIn: "Connexion…",
    forgot: "PIN oublié ?",
    forgotAction: "Demandez à votre école de le réinitialiser.",
    secured: "Sécurisé par EduTrack · Flint Technologies",
    backHome: "Retour à l'accueil",
  },
};

export function LoginForm() {
  const { locale, setLocale } = useI18n();
  const t = STR[locale];
  const [mode, setMode] = useState<"phone" | "student">("phone");
  const [ident, setIdent] = useState("");
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  const minIdent = mode === "phone" ? 6 : 3;
  const valid = ident.trim().length >= minIdent && pin.length === 5;

  function switchMode(m: "phone" | "student") {
    setMode(m);
    setIdent("");
    setPin("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || loading) return;
    setError(null);
    setLoading(true);
    const res =
      mode === "phone"
        ? await signIn({ phone: ident.trim(), pin })
        : await signInStudent({ code: ident.trim(), pin });
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
    // success → the server action redirects
  }

  return (
    <main className="flex min-h-dvh flex-col bg-bg text-ink">
      <div className="flex items-center gap-2 p-4">
        <a href="/" aria-label={t.backHome} className="mr-auto grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink">
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

      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6 pb-10">
        <div className="et-pop">
          <div className="mb-7 text-center">
            <div className="mb-4 flex justify-center text-ink">
              <OriginMark size={56} rings />
            </div>
            <div className="font-display text-[22px] font-bold">EduTrack</div>
            <h1 className="mt-4 font-display text-2xl font-semibold">{t.welcome}</h1>
            <p className="mt-1 text-sm text-muted">{t.sub}</p>
          </div>

          <div className="flex gap-2.5">
            {([
              ["phone", t.acctPhone, Phone],
              ["student", t.acctStudent, GraduationCap],
            ] as const).map(([m, label, Icon]) => {
              const on = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  aria-pressed={on}
                  className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border py-3 text-[12.5px] font-medium transition-colors ${
                    on ? "border-primary bg-blue-bg text-ink" : "border-line bg-surface text-ink"
                  }`}
                >
                  <Icon size={22} className={on ? "text-primary" : "text-muted"} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>

          <form onSubmit={onSubmit} className="mt-4">
            <label htmlFor="ident" className="et-label mt-1">
              {mode === "phone" ? t.phoneLabel : t.codeLabel}
            </label>
            <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-surface focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--et-blue-bg)]">
              {mode === "phone" && (
                <span className="flex items-center border-r border-line px-3 text-[15px] text-muted">
                  +237
                </span>
              )}
              <input
                id="ident"
                type={mode === "phone" ? "tel" : "text"}
                inputMode={mode === "phone" ? "tel" : "text"}
                autoComplete="username"
                value={ident}
                onChange={(e) => setIdent(e.target.value)}
                placeholder={mode === "phone" ? t.phonePh : t.codePh}
                className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-base text-ink outline-none placeholder:text-muted"
              />
            </div>

            <label className="et-label mt-4">{t.pinLabel}</label>
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1" onClick={() => pinRef.current?.focus()}>
                <input
                  ref={pinRef}
                  id="pin"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={5}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  aria-label={t.pinLabel}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <div className="flex gap-2" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const active = i === Math.min(pin.length, 4);
                    return (
                      <div
                        key={i}
                        className={`grid h-[52px] flex-1 place-items-center rounded-xl border bg-surface text-[22px] font-semibold ${
                          active ? "border-primary shadow-[0_0_0_3px_var(--et-blue-bg)]" : "border-line"
                        }`}
                      >
                        {i < pin.length ? (show ? pin[i] : "•") : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? t.hidePin : t.showPin}
                className="grid size-10 place-items-center rounded-lg text-muted hover:bg-line"
              >
                {show ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button type="submit" disabled={!valid || loading} className="et-btn mt-5 w-full py-3.5 text-[15px]">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  {t.signingIn}
                </>
              ) : (
                <>
                  {t.signIn}
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            {t.forgot} <span className="font-medium text-primary">{t.forgotAction}</span>
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11.5px] text-muted">
          <Lock size={13} aria-hidden="true" />
          {t.secured}
        </div>
      </div>
    </main>
  );
}
