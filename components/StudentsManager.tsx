"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { addStudent, bulkAddStudents, enableStudentLogin } from "@/app/admin/students/actions";

export type StudentsData = {
  schoolName: string;
  classes: { id: string; name: string }[];
  students: { id: string; name: string; className: string; loginCode: string | null }[];
};

function LoginCell({ id, loginCode }: { id: string; loginCode: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ code: string; pin?: string } | null>(null);

  if (loginCode) {
    return <span className="font-mono text-[11px] text-success">{t("studentCodeWord")} {loginCode}</span>;
  }
  if (issued) {
    return (
      <span className="font-mono text-[11px] text-success">
        {t("studentCodeWord")} {issued.code}
        {issued.pin ? ` · ${t("studentPinWord")} ${issued.pin}` : ""}
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await enableStudentLogin(id);
        setBusy(false);
        if (res.ok && res.code) {
          setIssued({ code: res.code, pin: res.pin });
          router.refresh();
        }
      }}
      className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline disabled:opacity-60"
    >
      {busy ? t("adding") : t("enableLogin")}
    </button>
  );
}

export function StudentsManager({ data }: { data: StudentsData }) {
  const { t } = useI18n();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [classGroupId, setClassGroupId] = useState(data.classes[0]?.id ?? "");
  const [parentPhone, setParentPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentCapability, setParentCapability] = useState("");
  const [adding, setAdding] = useState(false);

  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setMsg(null);
    try {
      await addStudent({
        firstName,
        lastName,
        gender: gender || undefined,
        classGroupId,
        parentPhone,
        parentName: parentName || undefined,
        parentCapability: (parentCapability || undefined) as "SMARTPHONE" | "WHATSAPP" | "SMS_ONLY" | undefined,
      });
      setFirstName("");
      setLastName("");
      setGender("");
      setParentPhone("");
      setParentName("");
      setParentCapability("");
      router.refresh();
    } catch {
      setMsg("error");
    } finally {
      setAdding(false);
    }
  }

  async function onImport() {
    setImporting(true);
    setMsg(null);
    try {
      const res = await bulkAddStudents(csv);
      setMsg(`+${res.added} · ${res.failed} failed`);
      setCsv("");
      router.refresh();
    } catch {
      setMsg("error");
    } finally {
      setImporting(false);
    }
  }

  const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("studentsNav")}</h1>
          <p className="text-muted">
            {data.schoolName} · {data.students.length} {t("enrolled")}
          </p>
        </div>
      </header>

      {/* Add one */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("addStudent")}</h2>
        <form onSubmit={onAdd} className="grid grid-cols-2 gap-3">
          <input className={field} placeholder={t("fldFirst")} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <input className={field} placeholder={t("fldLast")} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <select className={field} value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} required>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input className={field} placeholder={t("fldGender")} maxLength={1} value={gender} onChange={(e) => setGender(e.target.value.toUpperCase())} />
          <input className={field} placeholder={t("fldParentPhone")} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required />
          <input className={field} placeholder={t("fldParentName")} value={parentName} onChange={(e) => setParentName(e.target.value)} />
          <select className={`${field} col-span-2`} value={parentCapability} onChange={(e) => setParentCapability(e.target.value)} aria-label={t("capLabel")}>
            <option value="">{t("capUnknown")}</option>
            <option value="SMARTPHONE">{t("capSmart")}</option>
            <option value="WHATSAPP">{t("capWhatsapp")}</option>
            <option value="SMS_ONLY">{t("capSms")}</option>
          </select>
          <button
            type="submit"
            disabled={adding || !classGroupId}
            className="col-span-2 min-h-11 rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60"
          >
            {adding ? t("adding") : t("addBtn")}
          </button>
        </form>
      </section>

      {/* Bulk CSV */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 font-display text-lg font-bold text-ink">{t("bulkCsv")}</h2>
        <p className="mb-3 font-mono text-[11px] text-muted">{t("csvHint")}</p>
        <textarea
          className="min-h-28 w-full rounded-lg border border-line bg-surface p-3 font-mono text-xs"
          placeholder={"Marie,Tabi,F,Form 5 Science A,+237670000123,Mrs Tabi"}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onImport}
            disabled={importing || !csv.trim()}
            className="min-h-11 rounded-full border border-flint-blue/30 px-5 font-mono text-sm text-primary disabled:opacity-60"
          >
            {importing ? t("importing") : t("importBtn")}
          </button>
          {msg && <span className="font-mono text-xs text-muted">{msg}</span>}
        </div>
      </section>

      {/* Roster */}
      <h2 className="mb-2 mt-8 font-mono text-xs uppercase tracking-widest text-muted">
        {t("enrolled")} · {data.students.length}
      </h2>
      <ul className="space-y-1">
        {data.students.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2 text-sm">
            <span className="min-w-0 truncate text-ink">{s.name}</span>
            <span className="flex shrink-0 items-center gap-3">
              <LoginCell id={s.id} loginCode={s.loginCode} />
              <span className="font-mono text-xs text-muted">{s.className}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
