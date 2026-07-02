"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  payments: { id: string; amount: number; reference: string; date: string }[];
};
export type ParentFeesData = { parentPhone: string; children: ChildFees[] };

const field = "min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base";

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
      <div className="mt-3 rounded-xl border border-success/30 bg-success/5 p-4 text-center">
        <div className="font-display font-bold text-success">{t("paymentDone")}</div>
        <div className="mt-1 font-mono text-sm tabular-nums text-flint-black">{formatFcfa(receipt.amount)}</div>
        <div className="mt-1 font-mono text-xs text-muted">{t("feeRef")}: {receipt.reference}</div>
        {receipt.paymentId && (
          <a
            href={`/receipt/${receipt.paymentId}`}
            className="mt-2 inline-flex min-h-10 items-center rounded-full border border-success/40 px-4 font-mono text-xs uppercase tracking-widest text-success hover:underline"
          >
            {t("receiptWord")} ↓
          </a>
        )}
      </div>
    );
  }

  if (child.balance <= 0) {
    return <p className="mt-3 text-center font-mono text-xs uppercase tracking-widest text-success">{t("feePaidUp")}</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white">
        {t("payWithMomo")}
      </button>
    );
  }

  return (
    <form onSubmit={onPay} className="mt-3 space-y-2 border-t border-black/5 pt-3">
      <label className="block text-sm">
        <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("momoNumber")}</span>
        <input className={field} value={momo} onChange={(e) => setMomo(e.target.value)} inputMode="tel" required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("feeAmount")}</span>
        <input className={field} type="number" min={1} max={child.balance} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <p className="font-mono text-[11px] text-muted">{t("mockMomoNote")}</p>
      <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60">
        {busy ? t("paying") : `${t("payNow")} · ${formatFcfa(Number(amount) || 0)}`}
      </button>
      {err && <p className="text-center text-sm text-error">{err}</p>}
    </form>
  );
}

export function ParentFees({ data }: { data: ParentFeesData }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-[560px] px-4 pb-16 pt-6">
      <MessagesHeader backHref="/parent" parent />
      <h1 className="mb-1 -mt-3 font-display text-2xl font-bold text-flint-black">{t("feesNav")}</h1>
      <p className="mb-5 text-sm text-muted">{t("feeIntro")}</p>

      <div className="space-y-4">
        {data.children.map((c) => (
          <section key={c.studentId} className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-flint-black">{c.name}</h2>
                <p className="font-mono text-xs text-muted">{c.school} · {c.className}</p>
              </div>
              <div className="text-right">
                <div className={`font-display text-2xl font-bold tabular-nums ${c.balance > 0 ? "text-error" : "text-success"}`}>
                  {formatFcfa(Math.max(0, c.balance))}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{t("feeBalance")}</div>
              </div>
            </div>

            <div className="mt-3 flex gap-4 border-t border-black/5 pt-3 font-mono text-xs text-muted">
              <span>{t("feeBilled")}: <span className="text-flint-black">{formatFcfa(c.billed)}</span></span>
              <span>{t("feePaid")}: <span className="text-flint-black">{formatFcfa(c.paid)}</span></span>
            </div>

            <PayBox child={c} parentPhone={data.parentPhone} />

            {c.payments.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-black/5 pt-3">
                {c.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 font-mono text-xs">
                    <span className="min-w-0 truncate text-muted">{p.date} · {p.reference}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tabular-nums text-success">{formatFcfa(p.amount)}</span>
                      <a href={`/receipt/${p.id}`} className="uppercase tracking-widest text-flint-blue hover:underline">
                        {t("receiptWord")}
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
