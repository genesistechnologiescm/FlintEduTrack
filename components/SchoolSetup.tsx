"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { addClass, addSubject, addComponent, deleteComponent } from "@/app/admin/setup/actions";

type Stream = "SCIENCES" | "ARTS" | "COMMERCIAL" | "TECHNICAL" | null;
export type SetupData = {
  schoolName: string;
  yearLabel: string | null;
  classes: { id: string; name: string; form: string; stream: Stream }[];
  subjects: { id: string; name: string; code: string | null; stream: Stream }[];
  components: { id: string; name: string; weight: number }[];
};

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
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
  return <span className="rounded-full bg-blue-bg px-2 py-0.5 font-mono text-[10px] uppercase text-primary">{t(STREAM_KEYS[stream])}</span>;
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
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("setupNav")}</h1>
          <p className="text-muted">
            {data.schoolName}
            {data.yearLabel ? ` · ${data.yearLabel}` : ""}
          </p>
        </div>
        <LanguageToggle />
      </header>

      {/* Classes */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("classesTitle")}</h2>
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
          <button type="submit" disabled={cBusy} className="min-h-11 rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
            {cBusy ? t("adding") : t("addClass")}
          </button>
          {cErr && <p className="col-span-2 text-xs text-error">{cErr}</p>}
        </form>

        {data.classes.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line pt-4">
            {data.classes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink">{c.name}</span>
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
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("subjectsTitle")}</h2>
        <form onSubmit={onAddSubject} className="grid grid-cols-2 gap-3">
          <input className={field} placeholder={t("fldSubjectName")} value={sName} onChange={(e) => setSName(e.target.value)} required />
          <input className={field} placeholder={t("fldCode")} value={sCode} onChange={(e) => setSCode(e.target.value)} />
          <StreamSelect value={sStream} onChange={setSStream} />
          <button type="submit" disabled={sBusy} className="min-h-11 rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
            {sBusy ? t("adding") : t("addSubject")}
          </button>
          {sErr && <p className="col-span-2 text-xs text-error">{sErr}</p>}
        </form>

        {data.subjects.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line pt-4">
            {data.subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink">
                  {s.name}
                  {s.code ? <span className="ml-2 font-mono text-xs text-muted">{s.code}</span> : null}
                </span>
                <StreamTag stream={s.stream} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ComponentsSection components={data.components} />
    </main>
  );
}

// Assessment components (CA configuration): how a sequence mark is composed.
// Grade entry switches to component-wise input only when weights total 100%.
function ComponentsSection({ components }: { components: { id: string; name: string; weight: number }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sum = components.reduce((n, c) => n + c.weight, 0);
  const active = sum === 100;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await addComponent({ name, weight: Number(weight) });
    setBusy(false);
    if (res.ok) {
      setName("");
      setWeight("");
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  async function onDelete(id: string) {
    await deleteComponent(id);
    router.refresh();
  }

  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink">{t("caTitle")}</h2>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${
            active ? "bg-success/15 text-success" : "bg-warn-bg text-warn"
          }`}
        >
          {sum}%
        </span>
      </div>
      <p className="mb-3 text-sm text-muted">{active ? t("caActive") : t("caSumNote")}</p>

      <form onSubmit={onAdd} className="grid grid-cols-3 gap-2">
        <input className={`${field} col-span-2`} placeholder={t("caName")} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        <input className={field} type="number" min={1} max={100} inputMode="numeric" placeholder={t("caWeight")} value={weight} onChange={(e) => setWeight(e.target.value)} required />
        <button type="submit" disabled={busy} className="col-span-3 min-h-11 rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
          {busy ? t("adding") : t("caAdd")}
        </button>
        {err && <p className="col-span-3 text-center text-sm text-error">{err}</p>}
      </form>

      {components.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line pt-4">
          {components.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3">
              <span className="font-medium text-ink">{c.name}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-sm tabular-nums text-ink">{c.weight}%</span>
                <button type="button" onClick={() => onDelete(c.id)} className="font-mono text-xs uppercase text-error hover:underline">
                  {t("resDelete")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
