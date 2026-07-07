"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { addStaff, updateStaff, removeStaff } from "@/app/admin/staff/actions";

type Scope = "FULL" | "FINANCE" | "WELFARE";
type Staff = { userId: string; name: string; phone: string; role: "ADMIN" | "TEACHER"; title: string | null; adminScope: Scope; isSelf: boolean };
export type StaffData = { schoolName: string; staff: Staff[] };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

function StaffRow({ m }: { m: Staff }) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(m.role);
  const [title, setTitle] = useState(m.title ?? "");
  const [scope, setScope] = useState<Scope>(m.adminScope);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await updateStaff({ userId: m.userId, role, title: title || undefined, adminScope: role === "ADMIN" ? scope : undefined });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    const res = await removeStaff(m.userId);
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr(res.error ?? "error");
  }

  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-ink">{m.name}</span>
            {m.isSelf && <span className="font-mono text-[10px] uppercase text-muted">({t("staffYou")})</span>}
          </div>
          <div className="font-mono text-xs text-muted">{m.phone}{m.title ? ` · ${m.title}` : ""}</div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {m.role === "ADMIN" && m.adminScope !== "FULL" && (
            <span className="rounded-full bg-warn-bg px-2 py-0.5 font-mono text-[10px] uppercase text-warn">
              {m.adminScope === "FINANCE" ? t("scopeFinance") : t("scopeWelfare")}
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${m.role === "ADMIN" ? "bg-blue-bg text-primary" : "bg-chip text-muted"}`}>
            {m.role === "ADMIN" ? t("roleAdmin") : t("roleTeacher")}
          </span>
        </span>
      </div>

      {editing ? (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
          <select className={field} value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "TEACHER")}>
            <option value="ADMIN">{t("roleAdmin")}</option>
            <option value="TEACHER">{t("roleTeacher")}</option>
          </select>
          <input className={field} placeholder={t("staffTitle")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          {role === "ADMIN" && (
            <select className={`${field} col-span-2`} value={scope} onChange={(e) => setScope(e.target.value as Scope)} aria-label={t("staffScope")}>
              <option value="FULL">{t("scopeFull")}</option>
              <option value="FINANCE">{t("scopeFinance")}</option>
              <option value="WELFARE">{t("scopeWelfare")}</option>
            </select>
          )}
          <button type="button" onClick={save} disabled={busy} className="min-h-10 rounded-full bg-primary font-mono text-xs uppercase tracking-widest text-white disabled:opacity-60">
            {busy ? t("adding") : t("save")}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="min-h-10 rounded-full border border-line font-mono text-xs uppercase tracking-widest text-muted">
            {t("cancel")}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-4">
          <button type="button" onClick={() => setEditing(true)} className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
            {t("staffEdit")}
          </button>
          {!m.isSelf && (
            <button type="button" onClick={remove} disabled={busy} className="font-mono text-[11px] uppercase tracking-widest text-error hover:underline disabled:opacity-60">
              {t("staffRemove")}
            </button>
          )}
        </div>
      )}
      {err && <p className="mt-2 text-xs text-error">{err}</p>}
    </li>
  );
}

export function StaffManager({ data }: { data: StaffData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"ADMIN" | "TEACHER">("TEACHER");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<Scope>("FULL");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ pin?: string; existing?: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setIssued(null);
    const res = await addStaff({ name, phone, role, title: title || undefined, adminScope: role === "ADMIN" ? scope : undefined });
    setBusy(false);
    if (res.ok) {
      setIssued({ pin: res.pin, existing: res.existing });
      setName("");
      setPhone("");
      setTitle("");
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("staffNav")}</h1>
          <p className="text-muted">{data.schoolName} · {data.staff.length}</p>
        </div>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("addStaff")}</h2>
        <form onSubmit={onAdd} className="grid grid-cols-2 gap-3">
          <input className={field} placeholder={t("fldName")} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={field} placeholder={t("fldPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <select className={field} value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "TEACHER")}>
            <option value="TEACHER">{t("roleTeacher")}</option>
            <option value="ADMIN">{t("roleAdmin")}</option>
          </select>
          <input className={field} placeholder={t("staffTitle")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          {role === "ADMIN" && (
            <select className={`${field} col-span-2`} value={scope} onChange={(e) => setScope(e.target.value as Scope)} aria-label={t("staffScope")}>
              <option value="FULL">{t("scopeFull")}</option>
              <option value="FINANCE">{t("scopeFinance")}</option>
              <option value="WELFARE">{t("scopeWelfare")}</option>
            </select>
          )}
          <button type="submit" disabled={busy} className="col-span-2 min-h-11 rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
            {busy ? t("adding") : t("addStaffBtn")}
          </button>
        </form>
        {issued && (
          <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-center text-sm text-success">
            {issued.existing ? t("staffLinked") : `${t("staffLoginReady")} · ${t("studentPinWord")} ${issued.pin}`}
          </p>
        )}
        {err && <p className="mt-3 text-center text-sm text-error">{err}</p>}
      </section>

      <ul className="mt-4 space-y-3">
        {data.staff.map((m) => (
          <StaffRow key={m.userId} m={m} />
        ))}
      </ul>
    </>
  );
}
