"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { formatFcfa } from "@/lib/fees";
import { addFeeItem, deleteFeeItem, sendOverdueReminders, recordPayment } from "@/app/admin/fees/actions";

type FeeRow = { id: string; label: string; amount: number; target: string | null; applicable: number };
type PaymentRow = { id: string; student: string; amount: number; reference: string; method: string; date: string };
type OverdueRow = { studentId: string; name: string; className: string; overdueAmount: number; daysOverdue: number };
type StudentRow = { id: string; name: string; className: string; balance: number };
export type AdminFeesData = {
  schoolName: string;
  termLabel: string | null;
  billed: number;
  collected: number;
  waived: number;
  overdue: OverdueRow[];
  classes: { id: string; name: string }[];
  students: StudentRow[];
  fees: FeeRow[];
  payments: PaymentRow[];
};

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "alert" | "ok" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`mt-1 font-display text-xl font-bold tabular-nums ${tone === "alert" ? "text-error" : tone === "ok" ? "text-success" : "text-ink"}`}>
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
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [remindBusy, setRemindBusy] = useState(false);
  const [remindMsg, setRemindMsg] = useState<string | null>(null);

  // Record-a-payment (office desk)
  const [payStudentId, setPayStudentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "MOMO" | "WAIVER">("CASH");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  const [payDone, setPayDone] = useState<{ paymentId: string; newBalance: number } | null>(null);
  const selectedStudent = data.students.find((s) => s.id === payStudentId) ?? null;

  // Waivers reduce what's owed but aren't cash. Outstanding subtracts both; the
  // collection rate measures cash against fees that were actually expected to be
  // paid (billed minus what the school chose to forgive), so waivers don't drag it.
  const outstanding = Math.max(0, data.billed - data.collected - data.waived);
  const expected = Math.max(0, data.billed - data.waived);
  const rate = expected > 0 ? Math.round((data.collected / expected) * 100) : 0;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await addFeeItem({ label, amount: Number(amount), classGroupId: classGroupId || undefined, dueDate: dueDate || undefined });
    setBusy(false);
    if (res.ok) {
      setLabel("");
      setAmount("");
      setDueDate("");
      router.refresh();
    } else setErr(res.error ?? "error");
  }

  async function onRemind() {
    setRemindBusy(true);
    setRemindMsg(null);
    const res = await sendOverdueReminders();
    setRemindBusy(false);
    if (res.ok) setRemindMsg(`${res.reminded} · ${res.costFcfa} FCFA`);
    router.refresh();
  }

  async function onDelete(id: string) {
    await deleteFeeItem(id);
    router.refresh();
  }

  async function onRecord(e: React.FormEvent) {
    e.preventDefault();
    setPayBusy(true);
    setPayErr(null);
    setPayDone(null);
    try {
      const res = await recordPayment({
        studentId: payStudentId,
        amount: Number(payAmount),
        method: payMethod,
        reference: payRef || undefined,
        note: payNote || undefined,
      });
      if (res.ok && res.paymentId) {
        setPayDone({ paymentId: res.paymentId, newBalance: res.newBalance ?? 0 });
        setPayAmount("");
        setPayRef("");
        setPayNote("");
        router.refresh();
      } else setPayErr(res.error ?? "error");
    } catch {
      setPayErr("error");
    } finally {
      setPayBusy(false);
    }
  }

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <a href="/admin" className="font-mono text-xs uppercase tracking-widest text-primary hover:underline">
            ← {t("backDash")}
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">{t("feesNav")}</h1>
          <p className="text-muted">
            {data.schoolName}
            {data.termLabel ? ` · ${data.termLabel}` : ""}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat label={t("feeBilled")} value={formatFcfa(data.billed)} />
        <Stat label={t("feeCollected")} value={formatFcfa(data.collected)} tone="ok" />
        {data.waived > 0 && <Stat label={t("feeWaived")} value={formatFcfa(data.waived)} />}
        <Stat label={t("feeOutstanding")} value={formatFcfa(outstanding)} tone={outstanding > 0 ? "alert" : undefined} />
        <Stat label={t("feeRate")} value={`${rate}%`} />
      </div>

      {/* Overdue desk — students past a fee due date with an unpaid balance */}
      {data.overdue.length > 0 && (
        <section className="mt-4 rounded-2xl border border-error/20 bg-error/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-error">
              {t("overdueTitle")} · {data.overdue.length}
            </h2>
            <button
              type="button"
              onClick={onRemind}
              disabled={remindBusy}
              className="min-h-10 shrink-0 rounded-full bg-error px-4 font-mono text-[11px] uppercase tracking-widest text-white disabled:opacity-60"
            >
              {remindBusy ? t("adding") : t("sendReminders")}
            </button>
          </div>
          {remindMsg && (
            <p className="mt-2 text-sm text-ink">
              {t("remindersSent")}: <span className="font-mono">{remindMsg}</span>
            </p>
          )}
          <ul className="mt-3 space-y-1.5">
            {data.overdue.map((o) => (
              <li key={o.studentId} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink">
                  {o.name} <span className="font-mono text-[11px] text-muted">· {o.className}</span>
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  <span className="font-bold text-error">{formatFcfa(o.overdueAmount)}</span>
                  <span className="text-muted"> · {o.daysOverdue}{t("daysShort")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">{t("addFee")}</h2>
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
          <label className="block text-sm">
            <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("feeDueDate")}</span>
            <input className={field} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60">
            {busy ? t("adding") : t("addFee")}
          </button>
          {err && <p className="text-center text-sm text-error">{err}</p>}
        </form>

        {data.fees.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line pt-4">
            {data.fees.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{f.label}</div>
                  <div className="font-mono text-xs text-muted">
                    {f.target ?? t("feeAllClasses")} · {f.applicable} {t("studentsWord")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-ink">{formatFcfa(f.amount)}</span>
                  <button type="button" onClick={() => onDelete(f.id)} className="font-mono text-xs uppercase text-error hover:underline">
                    {t("resDelete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Record a payment taken at the office — the bursar's daily action. */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold text-ink">{t("recordPayment")}</h2>
        <p className="mb-3 mt-0.5 text-sm text-muted">{t("recordPayHint")}</p>
        {data.students.length === 0 ? (
          <p className="py-2 text-sm text-muted">{t("noPayments")}</p>
        ) : (
          <form onSubmit={onRecord} className="space-y-3">
            <label className="block">
              <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("payPickStudent")}</span>
              <select
                className={field}
                value={payStudentId}
                onChange={(e) => {
                  setPayStudentId(e.target.value);
                  setPayDone(null);
                  setPayErr(null);
                }}
                required
              >
                <option value="">—</option>
                {data.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.className}
                  </option>
                ))}
              </select>
            </label>

            {selectedStudent && (
              <div className="flex items-center justify-between rounded-lg bg-chip px-3 py-2 text-sm">
                <span className="font-mono text-xs uppercase tracking-widest text-muted">{t("feeBalance")}</span>
                <span className="flex items-center gap-3">
                  <span className={`font-mono font-bold tabular-nums ${selectedStudent.balance > 0 ? "text-error" : "text-success"}`}>
                    {formatFcfa(selectedStudent.balance)}
                  </span>
                  {selectedStudent.balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(selectedStudent.balance))}
                      className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
                    >
                      {t("payFullBalance")}
                    </button>
                  )}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("feeAmount")}</span>
                <input
                  className={field}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">{t("payMethod")}</span>
                <select className={field} value={payMethod} onChange={(e) => setPayMethod(e.target.value as "CASH" | "MOMO" | "WAIVER")}>
                  <option value="CASH">{t("payMethodCash")}</option>
                  <option value="MOMO">{t("payMethodMomo")}</option>
                  <option value="WAIVER">{t("payMethodWaiver")}</option>
                </select>
              </label>
            </div>

            {payMethod !== "WAIVER" && (
              <input className={field} placeholder={t("payReference")} value={payRef} onChange={(e) => setPayRef(e.target.value)} maxLength={40} />
            )}
            <input
              className={field}
              placeholder={payMethod === "WAIVER" ? `${t("payReason")} *` : t("payNote")}
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              maxLength={200}
              required={payMethod === "WAIVER"}
            />

            <button
              type="submit"
              disabled={payBusy || !payStudentId}
              className="min-h-11 w-full rounded-full bg-primary font-mono text-sm font-medium text-white disabled:opacity-60"
            >
              {payBusy ? t("adding") : payMethod === "WAIVER" ? t("grantWaiverBtn") : t("payRecordBtn")}
            </button>
            {payErr && <p className="text-center text-sm text-error">{payErr}</p>}
            {payDone && (
              <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
                <span className="font-medium text-success">{t("payRecorded")}.</span>{" "}
                <span className="text-ink">
                  {t("payBalanceNow")}: <span className="font-mono tabular-nums">{formatFcfa(payDone.newBalance)}</span>
                </span>{" "}
                <a href={`/receipt/${payDone.paymentId}`} className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
                  {t("receiptWord")}
                </a>
              </div>
            )}
          </form>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">{t("recentPayments")}</h2>
          <span className="rounded-full bg-warn-bg px-2 py-0.5 font-mono text-[10px] text-warn">{t("mockMomo")}</span>
        </div>
        {data.payments.length === 0 ? (
          <p className="py-3 text-center text-muted">{t("noPayments")}</p>
        ) : (
          <ul className="space-y-2">
            {data.payments.map((p) => {
              const isWaiver = p.method === "WAIVER";
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-ink">{p.student}</span>
                    {isWaiver && (
                      <span className="shrink-0 rounded-full bg-chip px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
                        {t("feeWaived")}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-[10px] text-muted">{p.reference}</span>
                    <span className={`font-mono tabular-nums ${isWaiver ? "text-muted" : "text-success"}`}>
                      {isWaiver ? "−" : ""}{formatFcfa(p.amount)}
                    </span>
                    <a href={`/receipt/${p.id}`} className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline">
                      {t("receiptWord")}
                    </a>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
