"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { addClass, addSubject } from "@/app/admin/setup/actions";

type Stream = "SCIENCES" | "ARTS" | "COMMERCIAL" | "TECHNICAL" | null;
export type SetupData = {
  schoolName: string;
  yearLabel: string | null;
  classes: { id: string; name: string; form: string; stream: Stream }[];
  subjects: { id: string; name: string; code: string | null; stream: Stream }[];
};

const field = "min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base";
const STREAM_KEYS = { SCIENCES: "streamSciences", ARTS: "streamArts", COMMERCIAL: "streamCommercial", TECHNICAL: "streamTechnical" } as const;

function StreamSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("streamNone")}</option>
      {(Object.keys(STREAM_KEYS) as (keyof typeof STREAM_KEYS)[]).map((s) => (
        <option key={s} value={s}>{t(STREAM_KEYS[s])}</option>
      ))}
    </select>
  );
}

function StreamTag({ stream }: { stream: Stream }) {
  const { t } = useI18n();
  if (!stream) return null;
  return <span className="rounded-full bg-flint-blue/10 px-2 py-0.5 font-mono text-[10px] uppercase text-flint-blue">{t(STREAM_KEYS[stream])}</span>;
}

export function SchoolSetup({ data }: { data: SetupData }) {
  const { t } = useI18n();
  const router = useRouter();

  // Class form
  const [cName, setCName] = useState("");
  const [cForm, setCForm] = useState("1");
  const [cStream, setCStream] = useState("");
  const [cBusy, setCBusy] = useState(false);
  const [cErr, setCErr] = useState<string | null>(null);

  // Subject form
  const [sName, setSName] = useState("");
  const [sCode, setSCode] = useState("");
  const [sStream, setSStream] = useState("");
  const [sBusy, setSBusy] = useState(false);
  const [sErr, setSErr] = useState<string | null>(null);

  async function onAddClass(e: React.FormEvent) {
    e.preventDefault();
    setCBusy(true);
    setCErr(null);
    const res = await addClass({
      name: cName,
      formLevel: Number(cForm),
      streamType: (cStream || undefined) as "SCIENCES" | undefined,
    });
    setCBusy(false);
    if (res.ok) {
      setCName("");
      setCStream("");
      router.refresh();
    } else setCErr(res.error ?? "error");
  }

  async function onAddSubject(e: React.FormEvent) {
    e.preventDefault();
    setSBusy(true);
    setSErr(null);
    const res = await addSubject({
      name: sName,
      code: sCode || undefined,
      streamType: (sStream || undefined) as "SCIENCES" | undefined,
    });
    setSBusy(false);
    if (res.ok) {
      setSName("");
      setSCode("");
      setSStream("");
      router.refresh();
    } else setSErr(res.error ?? "error");
  }

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("setupNav")}</h1>
          <p className="text-muted">
            {data.schoolName}
            {data.yearLabel ? ` · ${data.yearLabel}` : ""}
          </p>
        </div>
        <LanguageToggle />
      </header>

      {/* Classes */}
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-flint-black">{t("classesTitle")}</h2>
        <form onSubmit={onAddClass} className="grid grid-cols-2 gap-3">
          <input className={field} placeholder={t("fldClassName")} value={cName} onChange={(e) => setCName(e.target.value)} required />
          <select className={field} value={cForm} onChange={(e) => setCForm(e.target.value)}>
            <option value="1">Form 1</option>
            <option value="2">Form 2</option>
            <option value="3">Form 3</option>
            <option value="4">Form 4</option>
            <option value="5">Form 5</option>
            <option value="6">Lower Sixth</option>
            <option value="7">Upper Sixth</option>
          </select>
          <StreamSelect value={cStream} onChange={setCStream} />
          <button type="submit" disabled={cBusy} className="min-h-11 rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60">
            {cBusy ? t("adding") : t("addClass")}
          </button>
          {cErr && <p className="col-span-2 text-xs text-error">{cErr}</p>}
        </form>

        {data.classes.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-black/5 pt-4">
            {data.classes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="font-medium text-flint-black">{c.name}</span>
                <span className="flex items-center gap-2">
                  <StreamTag stream={c.stream} />
                  <span className="font-mono text-xs text-muted">{c.form}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Subjects */}
      <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-flint-black">{t("subjectsTitle")}</h2>
        <form onSubmit={onAddSubject} className="grid grid-cols-2 gap-3">
          <input className={field} placeholder={t("fldSubjectName")} value={sName} onChange={(e) => setSName(e.target.value)} required />
          <input className={field} placeholder={t("fldCode")} value={sCode} onChange={(e) => setSCode(e.target.value)} />
          <StreamSelect value={sStream} onChange={setSStream} />
          <button type="submit" disabled={sBusy} className="min-h-11 rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60">
            {sBusy ? t("adding") : t("addSubject")}
          </button>
          {sErr && <p className="col-span-2 text-xs text-error">{sErr}</p>}
        </form>

        {data.subjects.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-black/5 pt-4">
            {data.subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="font-medium text-flint-black">
                  {s.name}
                  {s.code ? <span className="ml-2 font-mono text-xs text-muted">{s.code}</span> : null}
                </span>
                <StreamTag stream={s.stream} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
