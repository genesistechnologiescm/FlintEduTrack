"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { postAnnouncement } from "@/app/admin/announcements/actions";

type Sent = {
  id: string;
  title: string;
  body: string;
  audienceLabel: string;
  isClass: boolean;
  recipients: number;
  author: string;
  date: string;
};
export type AnnouncementsData = {
  schoolName: string;
  isAdmin: boolean;
  classes: { id: string; name: string }[];
  sent: Sent[];
};

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

export function AnnouncementsManager({ data }: { data: AnnouncementsData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"SCHOOL" | "CLASS">("SCHOOL");
  const [classGroupId, setClassGroupId] = useState(data.classes[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await postAnnouncement({
        title,
        body,
        audience,
        classGroupId: audience === "CLASS" ? classGroupId : undefined,
      });
      if (res.ok) {
        setMsg(`${res.recipients} ${t("recipientsWord")}`);
        setTitle("");
        setBody("");
        router.refresh();
      } else setErr(res.error ?? "error");
    } catch {
      setErr(t("loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href={data.isAdmin ? "/admin" : "/attendance"} className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {data.isAdmin ? t("backDash") : t("backAttendance")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("announcementsNav")}</h1>
          <p className="text-muted">{data.schoolName}</p>
        </div>
        <LanguageToggle />
      </header>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("newAnnouncement")}</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldTitle")}</span>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldMessage")}</span>
            <textarea
              className="min-h-28 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldAudience")}</span>
              <select className={field} value={audience} onChange={(e) => setAudience(e.target.value as "SCHOOL" | "CLASS")}>
                <option value="SCHOOL">{t("audWholeSchool")}</option>
                <option value="CLASS">{t("audClass")}</option>
              </select>
            </label>
            {audience === "CLASS" && (
              <label className="text-sm">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldClass")}</span>
                <select className={field} value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)}>
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
            {busy ? t("adding") : t("sendAnnouncement")}
          </button>
          {msg && <p className="text-center text-sm text-success">{msg}</p>}
          {err && <p className="text-center text-sm text-error">{err}</p>}
        </form>
      </section>

      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("sentTitle")}</h2>
      {data.sent.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-5 text-center text-muted">{t("noSentYet")}</p>
      ) : (
        <ul className="space-y-3">
          {data.sent.map((a) => (
            <li key={a.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display font-bold text-ink">{a.title}</h3>
                <span className="shrink-0 font-mono text-xs text-muted">{a.date}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{a.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 font-mono text-[11px] text-muted">
                <span className="rounded-full bg-blue-bg px-2 py-0.5 uppercase text-primary">
                  {a.isClass ? a.audienceLabel : t("audWholeSchool")}
                </span>
                <span>{a.recipients} {t("recipientsWord")}</span>
                <span>· {a.author}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
