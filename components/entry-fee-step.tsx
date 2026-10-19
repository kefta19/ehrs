"use client";

import { useState, useTransition } from "react";
import { verifyBankTransferAction } from "@/app/actions/entry-fee";

export type AdminFee = {
  id: string;
  status: string;
  method: string | null;
  amount: number | string;
  ratePercent: number | string;
  bankReference?: string | null;
  transactionUrl?: string | null;
} | null;

/** Shown inside the review card. Payment state is informational: it never approves anything. */
export function EntryFeeAdmin({ fee }: { fee: AdminFee }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!fee)
    return (
      <div className="rounded-xl border border-slate-200 p-4 text-xs">
        <h4 className="font-bold text-slate-900">Entry fee</h4>
        <p className="text-rose-600">
          No entry-fee record (legacy submission).
        </p>
      </div>
    );

  const decide = (decision: "CONFIRM" | "REJECT") =>
    start(async () => {
      const fd = new FormData();
      fd.set("feeId", fee.id);
      fd.set("decision", decision);
      fd.set("note", note);
      const r = await verifyBankTransferAction(fd);
      setMsg(
        r.success
          ? { ok: true, text: r.message }
          : { ok: false, text: r.error },
      );
    });

  const tone =
    fee.status === "CONFIRMED"
      ? "text-emerald-700"
      : fee.status === "FAILED"
        ? "text-rose-600"
        : "text-amber-700";

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-xs">
      <h4 className="font-bold text-slate-900">
        Entry fee (payment verification)
      </h4>
      <div className="flex justify-between">
        <span className="text-slate-500">Amount</span>
        <strong>
          {Number(fee.amount).toLocaleString()} ETB ({Number(fee.ratePercent)}%)
        </strong>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Method</span>
        <strong>{fee.method ?? "—"}</strong>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Status</span>
        <strong className={tone}>{fee.status}</strong>
      </div>
      {fee.bankReference && (
        <div className="flex justify-between">
          <span className="text-slate-500">Bank reference</span>
          <strong className="font-mono">{fee.bankReference}</strong>
        </div>
      )}
      {fee.transactionUrl && (
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Transaction link</span>
          <a
            href={fee.transactionUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-blue-700 underline"
          >
            Open transaction details
          </a>
        </div>
      )}
      {fee.status !== "CONFIRMED" && (
        <p className="text-slate-500">
          You may approve the listing while payment is pending, but it will not
          go live until the fee is CONFIRMED.
        </p>
      )}
      {fee.status === "PENDING" && fee.method === "BANK_TRANSFER" && (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (required when rejecting)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-blue-600"
          />
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => decide("REJECT")}
              className="flex-1 rounded-xl border border-rose-200 py-2 font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
            >
              Reject payment
            </button>
            <button
              disabled={pending}
              onClick={() => decide("CONFIRM")}
              className="flex-1 rounded-xl bg-emerald-600 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Confirm payment received
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p className={msg.ok ? "text-emerald-700" : "text-rose-600"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
