"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { formatFcfa } from "@/lib/fees";
import { addFeeItem, deleteFeeItem } from "@/app/admin/fees/actions";

type FeeRow = { id: string; label: string; amount: number; target: string | null; applicable: number };
type PaymentRow = { id: string; student: string; amount: number; reference: string; method: string; date: string };
export type AdminFeesData = {
  schoolName: string;
  termLabel: string | null;
  billed: number;
  collected: number;
  classes: { id: string; name: string }[];
  fees: FeeRow[];
  payments: PaymentRow[];
};

const field = "min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "alert" | "ok" }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`mt-1 font-display text-xl font-bold tabular-nums ${tone === "alert" ? "text-error" : tone === "ok" ? "text-success" : "text-flint-black"}`}>
        {value}
      </div>
    </div>
  );
}

export function AdminFees({ data }: { data: AdminFeesData }) {
  const { t } = useI18n();
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [classGroupId, setClassGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const outstanding = Math.max(0, data.billed - data.collected);
  const rate = data.billed > 0 ? Math.round((data.collected / data.billed) * 100) : 0;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await addFeeItem({ label, amount: Number(amount), classGroupId: classGroupId || undefined });
    setBusy(false);
    if (res.ok) {
      setLabel("");
      setAmount("");
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  async function onDelete(id: string) {
    await deleteFeeItem(id);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-[640px] px-4 pb-16 pt-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-flint-black">{t("feesNav")}</h1>
          <p className="text-muted">
            {data.schoolName}
            {data.termLabel ? ` · ${data.termLabel}` : ""}
          </p>
        </div>
        <LanguageToggle />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat label={t("feeBilled")} value={formatFcfa(data.billed)} />
        <Stat label={t("feeCollected")} value={formatFcfa(data.collected)} tone="ok" />
        <Stat label={t("feeOutstanding")} value={formatFcfa(outstanding)} tone={outstanding > 0 ? "alert" : undefined} />
        <Stat label={t("feeRate")} value={`${rate}%`} />
      </div>

      <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-flint-black">{t("addFee")}</h2>
        <form onSubmit={onAdd} className="space-y-3">
          <input className={field} placeholder={t("feeLabel")} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} required />
          <div className="grid grid-cols-2 gap-3">
            <input className={field} type="number" min={1} inputMode="numeric" placeholder={t("feeAmount")} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <select className={field} value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)}>
              <option value="">{t("feeAllClasses")}</option>
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-flint-blue font-mono text-sm font-medium text-white disabled:opacity-60">
            {busy ? t("adding") : t("addFee")}
          </button>
          {err && <p className="text-center text-sm text-error">{err}</p>}
        </form>

        {data.fees.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-black/5 pt-4">
            {data.fees.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-flint-black">{f.label}</div>
                  <div className="font-mono text-xs text-muted">
                    {f.target ?? t("feeAllClasses")} · {f.applicable} {t("studentsWord")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-flint-black">{formatFcfa(f.amount)}</span>
                  <button type="button" onClick={() => onDelete(f.id)} className="font-mono text-xs uppercase text-error hover:underline">
                    {t("resDelete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">{t("recentPayments")}</h2>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-700">{t("mockMomo")}</span>
        </div>
        {data.payments.length === 0 ? (
          <p className="py-3 text-center text-muted">{t("noPayments")}</p>
        ) : (
          <ul className="space-y-2">
            {data.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-flint-black">{p.student}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[10px] text-muted">{p.reference}</span>
                  <span className="font-mono tabular-nums text-success">{formatFcfa(p.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
