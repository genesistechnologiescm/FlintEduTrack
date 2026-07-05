"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { MessagesHeader } from "./MessagesHeader";
import { formatFcfa } from "@/lib/fees";
import { payFees } from "@/app/parent/fees/actions";

type ChildFees = {
  studentId: string;
  name: string;
  school: string;
  className: string;
  billed: number;
  paid: number;
  balance: number;
  overdueSince: string | null;
  payments: { id: string; amount: number; reference: string; date: string }[];
};
export type ParentFeesData = { parentPhone: string; children: ChildFees[] };

function PayBox({ child, parentPhone }: { child: ChildFees; parentPhone: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(0, child.balance)));
  const [momo, setMomo] = useState(parentPhone);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; amount: number; paymentId?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onPay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await payFees({ studentId: child.studentId, amount: Number(amount), momoNumber: momo });
    setBusy(false);
    if (res.ok && res.reference) {
      setReceipt({ reference: res.reference, amount: res.amount ?? Number(amount), paymentId: res.paymentId });
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  if (receipt) {
    return (
      <div className="mt-3 rounded-xl p-4 text-center" style={{ background: "var(--et-ok-bg)" }}>
        <div className="font-display font-semibold" style={{ color: "var(--et-ok)" }}>{t("paymentDone")}</div>
        <div className="mt-1 font-mono text-sm tabular-nums">{formatFcfa(receipt.amount)}</div>
        <div className="mt-1 font-mono text-xs text-muted">{t("feeRef")}: {receipt.reference}</div>
        {receipt.paymentId && (
          <a href={`/receipt/${receipt.paymentId}`} className="mt-2 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            <Download size={13} aria-hidden="true" /> {t("receiptWord")}
          </a>
        )}
      </div>
    );
  }

  if (child.balance <= 0) {
    return <p className="mt-3 text-center font-mono text-xs uppercase tracking-widest" style={{ color: "var(--et-ok)" }}>{t("feePaidUp")}</p>;
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="et-btn mt-3 w-full py-2.5 text-sm">{t("payWithMomo")}</button>;
  }

  return (
    <form onSubmit={onPay} className="mt-3 space-y-2 border-t border-line pt-3">
      <label className="block text-sm">
        <span className="et-label">{t("momoNumber")}</span>
        <input className="et-input" value={momo} onChange={(e) => setMomo(e.target.value)} inputMode="tel" required />
      </label>
      <label className="block text-sm">
        <span className="et-label">{t("feeAmount")}</span>
        <input className="et-input" type="number" min={1} max={child.balance} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <p className="font-mono text-[11px] text-muted">{t("mockMomoNote")}</p>
      <button type="submit" disabled={busy} className="et-btn w-full py-2.5 text-sm">
        {busy ? t("paying") : `${t("payNow")} · ${formatFcfa(Number(amount) || 0)}`}
      </button>
      {err && <p className="text-center text-sm text-danger">{err}</p>}
    </form>
  );
}

export function ParentFees({ data }: { data: ParentFeesData }) {
  const { t } = useI18n();

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto max-w-[560px] px-4 pb-16">
        <MessagesHeader backHref="/parent" parent titleKey="feesNav" />
        <p className="mb-4 text-sm text-muted">{t("feeIntro")}</p>

        <div className="space-y-4">
          {data.children.map((c) => (
            <section key={c.studentId} className="et-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{c.name}</h2>
                  <p className="font-mono text-xs text-muted">{c.school} · {c.className}</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold tabular-nums" style={{ color: c.balance > 0 ? "var(--et-danger)" : "var(--et-ok)" }}>
                    {formatFcfa(Math.max(0, c.balance))}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{t("feeBalance")}</div>
                  {c.overdueSince && (
                    <div className="mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] uppercase" style={{ background: "var(--et-danger-bg)", color: "var(--et-danger)" }}>
                      {t("feeOverdueSince")} {c.overdueSince}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-4 border-t border-line pt-3 font-mono text-xs text-muted">
                <span>{t("feeBilled")}: <span className="text-ink">{formatFcfa(c.billed)}</span></span>
                <span>{t("feePaid")}: <span className="text-ink">{formatFcfa(c.paid)}</span></span>
              </div>

              <PayBox child={c} parentPhone={data.parentPhone} />

              {c.payments.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-line pt-3">
                  {c.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 font-mono text-xs">
                      <span className="min-w-0 truncate text-muted">{p.date} · {p.reference}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="tabular-nums" style={{ color: "var(--et-ok)" }}>{formatFcfa(p.amount)}</span>
                        <a href={`/receipt/${p.id}`} className="uppercase tracking-widest text-primary hover:underline">{t("receiptWord")}</a>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
