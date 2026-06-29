"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { startThread, sendMessage, markThreadRead } from "@/app/messages/actions";

export type ThreadSummary = {
  id: string;
  subject: string;
  otherName: string;
  snippet: string;
  date: string;
  unread: number;
};
export type ThreadMessage = { id: string; fromParent: boolean; body: string; date: string };

const field = "min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base";
const area = "min-h-20 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-base";

export function ThreadList({ items, basePath }: { items: ThreadSummary[]; basePath: string }) {
  const { t } = useI18n();
  if (items.length === 0) {
    return <p className="rounded-xl border border-black/10 bg-white px-4 py-6 text-center text-muted">{t("noThreads")}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((th) => (
        <li key={th.id}>
          <a href={`${basePath}?t=${th.id}`} className="block rounded-2xl border border-black/10 bg-white p-4 transition-colors hover:bg-black/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {th.unread > 0 && <span className="inline-block size-2 shrink-0 rounded-full bg-flint-blue" />}
                <span className="truncate font-display font-bold text-flint-black">{th.subject}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">{th.date}</span>
            </div>
            <div className="mt-0.5 truncate font-mono text-xs text-muted">{th.otherName}</div>
            <div className="mt-1 truncate text-sm text-muted">{th.snippet}</div>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function NewThreadForm({ children, basePath }: { children: { id: string; name: string }[]; basePath: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [studentId, setStudentId] = useState(children[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await startThread({ studentId, subject, body });
    setBusy(false);
    if (res.ok && res.threadId) router.push(`${basePath}?t=${res.threadId}`);
    else setErr(res.error ?? "error");
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <h2 className="mb-3 font-display text-lg font-bold text-flint-black">{t("newMessage")}</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        {children.length > 1 && (
          <label className="block text-sm">
            <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("fldChild")}</span>
            <select className={field} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
        <input className={field} placeholder={t("fldSubject")} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} required />
        <textarea className={area} placeholder={t("fldMessage")} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} required />
        <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60">
          {busy ? t("adding") : t("sendBtn")}
        </button>
        {err && <p className="text-center text-sm text-error">{err}</p>}
      </form>
    </section>
  );
}

export function ThreadView({
  threadId,
  subject,
  aboutName,
  isStaff,
  messages,
  basePath,
}: {
  threadId: string;
  subject: string;
  aboutName?: string;
  isStaff: boolean;
  messages: ThreadMessage[];
  basePath: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  // Mark the other side's messages read on open (no refresh → avoid a loop).
  useEffect(() => {
    void markThreadRead(threadId);
  }, [threadId]);

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const res = await sendMessage({ threadId, body });
    setBusy(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <a href={basePath} className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
        ← {t("messagesNav")}
      </a>
      <h2 className="mt-1 font-display text-lg font-bold text-flint-black">{subject}</h2>
      {aboutName && <p className="font-mono text-xs text-muted">{aboutName}</p>}

      <ul className="mt-4 space-y-2">
        {messages.map((m) => {
          const mine = m.fromParent === !isStaff;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-flint-blue text-white" : "bg-black/5 text-flint-black"}`}>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                <div className={`mt-1 text-right font-mono text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>{m.date}</div>
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={onReply} className="mt-4 border-t border-black/5 pt-4">
        <textarea className={area} placeholder={t("replyPlaceholder")} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
        <button type="submit" disabled={busy} className="mt-2 min-h-11 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60">
          {busy ? t("adding") : t("sendBtn")}
        </button>
      </form>
    </section>
  );
}
