"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { signIn } from "@/app/login/actions";
import { LanguageToggle } from "./LanguageToggle";

export function LoginForm() {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn({ phone: phone.trim(), pin });
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

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="phone" className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">
              {t("phoneLabel")}
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="username"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6XX XX XX XX"
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
            disabled={loading || phone.length < 6 || pin.length !== 5}
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
