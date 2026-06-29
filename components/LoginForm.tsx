"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { signIn, signInStudent } from "@/app/login/actions";
import { LanguageToggle } from "./LanguageToggle";

export function LoginForm() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"phone" | "student">("phone");
  const [ident, setIdent] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const minIdent = mode === "phone" ? 6 : 3;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    // success → server action redirects
  }

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-flint-blue">
            <span className="inline-block size-2 rounded-full bg-flint-cyan" />
            EduTrack
          </div>
          <LanguageToggle />
        </div>

        <h1 className="font-display text-3xl font-bold text-flint-black">{t("loginTitle")}</h1>

        <div className="mt-5 flex gap-2" role="tablist">
          {(["phone", "student"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setIdent("");
                setError(null);
              }}
              className={`min-h-10 flex-1 rounded-full font-mono text-xs uppercase tracking-widest ${
                mode === m ? "bg-flint-blue text-white" : "border border-black/15 text-muted"
              }`}
            >
              {m === "phone" ? t("loginModePhone") : t("loginModeStudent")}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="ident" className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">
              {mode === "phone" ? t("phoneLabel") : t("studentCodeLabel")}
            </label>
            <input
              id="ident"
              type={mode === "phone" ? "tel" : "text"}
              inputMode={mode === "phone" ? "tel" : "text"}
              autoComplete="username"
              value={ident}
              onChange={(e) => setIdent(e.target.value)}
              placeholder={mode === "phone" ? "+237 6XX XX XX XX" : "e.g. TAB1234"}
              className="min-h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-base"
            />
          </div>

          <div>
            <label htmlFor="pin" className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">
              {t("pinLabel")}
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={5}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="•••••"
              className="min-h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-base tracking-[0.5em]"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || ident.trim().length < minIdent || pin.length !== 5}
            className="min-h-12 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white transition-opacity disabled:opacity-60"
          >
            {loading ? t("signingIn") : t("signInBtn")}
          </button>
        </form>

        <p className="mt-6 rounded-lg bg-black/5 px-3 py-2 text-center font-mono text-[11px] text-muted">
          {t("demoHint")}
        </p>
      </div>
    </main>
  );
}
