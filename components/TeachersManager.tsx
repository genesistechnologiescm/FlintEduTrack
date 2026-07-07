"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { addTeacher, assignTeacher } from "@/app/admin/teachers/actions";

type Teacher = { userId: string; name: string; phone: string; assignments: string[] };
export type TeachersData = {
  schoolName: string;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  teachers: Teacher[];
};

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

function AssignForm({ teacherUserId, data }: { teacherUserId: string; data: TeachersData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [classGroupId, setClassGroupId] = useState(data.classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("07:30");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await assignTeacher({ teacherUserId, classGroupId, subjectId, dayOfWeek: Number(dayOfWeek), startTime });
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr(res.error ?? "error");
  }

  return (
    <form onSubmit={submit} className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
      <select className={field} value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)}>
        {data.classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
        {data.subjects.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select className={field} value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
        {[1, 2, 3, 4, 5, 6].map((d) => (
          <option key={d} value={d}>{t(`d${d}` as "d1")}</option>
        ))}
      </select>
      <input className={field} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      <button type="submit" disabled={busy} className="col-span-2 min-h-10 rounded-full border border-flint-blue/30 font-mono text-xs uppercase tracking-widest text-primary disabled:opacity-60">
        {busy ? t("adding") : t("assignBtn")}
      </button>
      {err && <p className="col-span-2 text-xs text-error">{err}</p>}
    </form>
  );
}

export function TeachersManager({ data }: { data: TeachersData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await addTeacher({ name, phone });
      setName("");
      setPhone("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("teachersNav")}</h1>
          <p className="text-muted">
            {data.schoolName} · {data.teachers.length}
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("addTeacher")}</h2>
        <form onSubmit={onAdd} className="grid grid-cols-2 gap-3">
          <input className={field} placeholder={t("fldName")} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={field} placeholder={t("fldPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <button type="submit" disabled={busy} className="col-span-2 min-h-11 rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
            {busy ? t("adding") : t("addBtn")}
          </button>
        </form>
      </section>

      <ul className="mt-4 space-y-3">
        {data.teachers.map((tch) => (
          <li key={tch.userId} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-ink">{tch.name}</span>
              <span className="font-mono text-xs text-muted">{tch.phone}</span>
            </div>
            <div className="mt-1 text-sm text-muted">
              {t("teaches")}:{" "}
              {tch.assignments.length ? tch.assignments.join(" · ") : <span className="italic">{t("noAssign")}</span>}
            </div>
            <AssignForm teacherUserId={tch.userId} data={data} />
          </li>
        ))}
      </ul>
    </>
  );
}
