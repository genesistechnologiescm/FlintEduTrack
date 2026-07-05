"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { addResource, deleteResource } from "@/app/admin/resources/actions";

type Resource = {
  id: string;
  title: string;
  type: "LINK" | "NOTE";
  url: string | null;
  body: string | null;
  subject: string;
  target: string | null;
  views: number;
  reach: number;
};
export type ResourcesData = {
  schoolName: string;
  isAdmin: boolean;
  subjects: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  resources: Resource[];
};

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const area = "min-h-28 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base";

export function ResourcesManager({ data }: { data: ResourcesData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const [classGroupId, setClassGroupId] = useState("");
  const [type, setType] = useState<"LINK" | "NOTE">("LINK");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const noSubjects = data.subjects.length === 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await addResource({
      subjectId,
      classGroupId: classGroupId || undefined,
      type,
      title,
      url: type === "LINK" ? url : undefined,
      body: type === "NOTE" ? body : undefined,
    });
    setBusy(false);
    if (res.ok) {
      setTitle("");
      setUrl("");
      setBody("");
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  async function onDelete(id: string) {
    await deleteResource(id);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href={data.isAdmin ? "/admin" : "/attendance"} className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {data.isAdmin ? t("backDash") : t("backAttendance")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("resourcesNav")}</h1>
          <p className="text-muted">{data.schoolName}</p>
        </div>
        <LanguageToggle />
      </header>

      {noSubjects ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-muted">{t("resNoSubjects")}</p>
      ) : (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("addResource")}</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldSubject")}</span>
                <select className={field} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  {data.subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldClass")}</span>
                <select className={field} value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)}>
                  <option value="">{t("resAllClasses")}</option>
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex gap-2">
              {(["LINK", "NOTE"] as const).map((ty) => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setType(ty)}
                  className={`min-h-10 flex-1 rounded-full font-mono text-xs uppercase tracking-widest ${
                    type === ty ? "bg-primary text-white" : "border border-line text-muted"
                  }`}
                >
                  {ty === "LINK" ? t("resTypeLink") : t("resTypeNote")}
                </button>
              ))}
            </div>

            <input className={field} placeholder={t("fldTitle")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required />
            {type === "LINK" ? (
              <input className={field} type="url" inputMode="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} required />
            ) : (
              <textarea className={area} placeholder={t("resNotePlaceholder")} value={body} onChange={(e) => setBody(e.target.value)} maxLength={8000} required />
            )}

            <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
              {busy ? t("adding") : t("addResource")}
            </button>
            {err && <p className="text-center text-sm text-error">{err}</p>}
          </form>
        </section>
      )}

      <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-muted">{t("resPublished")}</h2>
      {data.resources.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-5 text-center text-muted">{t("resNone")}</p>
      ) : (
        <ul className="space-y-3">
          {data.resources.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-ink">{r.title}</h3>
                  <p className="font-mono text-xs text-muted">
                    {r.subject} · {r.target ?? t("resAllClasses")}
                    {r.views > 0 && (
                      <span className="text-primary"> · {r.views} {t("viewsWord")} · {r.reach} {t("reachWord")}</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-bg px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
                  {r.type === "LINK" ? t("resTypeLink") : t("resTypeNote")}
                </span>
              </div>
              {r.type === "LINK" && r.url ? (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-all font-mono text-xs text-primary hover:underline">
                  {r.url}
                </a>
              ) : (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted">{r.body}</p>
              )}
              <button
                type="button"
                onClick={() => onDelete(r.id)}
                className="mt-3 min-h-9 font-mono text-xs uppercase tracking-widest text-error hover:underline"
              >
                {t("resDelete")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
