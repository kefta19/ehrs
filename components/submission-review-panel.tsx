"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Fingerprint, FileText, XCircle } from "lucide-react";
import { reviewSubmissionAction } from "@/app/actions/review";
import { buildChecklist, failedItems } from "@/lib/listing-readiness";

export type PendingSubmission = {
  id: string;
  startingPrice: number | string;
  reservePrice?: number | string | null;
  minBidIncrement: number | string;
  startAt: string;
  endAt: string;
  terms?: string | null;
  createdAt: string;
  seller: { name: string; email: string };
  listing: {
    id: string;
    title: string;
    description: string;
    city: string;
    region: string;
    referenceNumber?: string | null;
    videoUrl?: string | null;
    ownerNationalId?: string | null;
    idDocumentMediaId?: string | null;
    biometricVerificationId?: string | null;
    biometricVerification?: { method: string; createdAt: string } | null;
    category: { name: string };
    images: { id: string; url: string }[];
    documents: { id: string; title: string; fileUrl: string }[];
  };
};

const money = (v: number | string | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString();
const when = (iso: string) => new Date(iso).toLocaleString();

export function SubmissionReviewPanel({
  submissions,
}: {
  submissions: PendingSubmission[];
}) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400 shadow-sm">
        No submissions are waiting for review.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {submissions.map((s) => (
        <SubmissionCard key={s.id} s={s} />
      ))}
    </div>
  );
}

function SubmissionCard({ s }: { s: PendingSubmission }) {
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const l = s.listing;
  const checklist = buildChecklist(l, s);
  const failed = failedItems(checklist);

  function decide(decision: "APPROVE" | "REJECT") {
    const fd = new FormData();
    fd.set("auctionId", s.id);
    fd.set("decision", decision);
    if (decision === "REJECT") {
      fd.set("reason", reason);
    } else {
      fd.set("confirmed", "true");
    }
    startTransition(async () => {
      const res = await reviewSubmissionAction(fd);
      setMsg(
        res.success
          ? { ok: true, text: res.message ?? "Success" }
          : { ok: false, text: res.error ?? "Error" },
      );
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-bold text-blue-600">{l.category.name}</span>
          <h3 className="text-base font-bold text-slate-900">{l.title}</h3>
          <p className="text-slate-500">
            {l.city}, {l.region} · Ref: {l.referenceNumber || "—"}
          </p>
          <p className="text-slate-400">
            Seller: <strong className="text-slate-700">{s.seller.name}</strong>{" "}
            ({s.seller.email}) · submitted {when(s.createdAt)}
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-700">
          Upcoming – awaiting review
        </span>
      </div>

      <p className="text-slate-600">{l.description}</p>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900">
            Photos ({l.images.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {l.images.map((im) => (
              <a
                key={im.id}
                href={im.url}
                target="_blank"
                rel="noreferrer"
                className="block aspect-square overflow-hidden rounded-lg bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={im.url}
                  alt="Listing photo"
                  className="h-full w-full object-cover"
                />
              </a>
            ))}
          </div>
          <h4 className="font-bold text-slate-900">Video post</h4>
          {l.videoUrl ? (
            l.videoUrl.startsWith("/") ? (
              <video
                src={l.videoUrl}
                controls
                preload="metadata"
                className="w-full rounded-xl bg-black"
              />
            ) : (
              <a
                href={l.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Open original social-media video post
              </a>
            )
          ) : (
            <p className="text-rose-600">No video post link provided.</p>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-bold text-slate-900">Owner identity</h4>
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <div className="flex justify-between">
              <span className="text-slate-500">National ID number</span>
              <span className="font-mono font-semibold text-slate-900">
                {l.ownerNationalId || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">National ID document</span>
              {l.idDocumentMediaId ? (
                <a
                  href={`/api/media/${l.idDocumentMediaId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                >
                  <FileText size={13} /> Open
                </a>
              ) : (
                <span className="text-rose-600">Missing</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fingerprint</span>
              {l.biometricVerification ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <Fingerprint size={13} /> Verified on device ·{" "}
                  {when(l.biometricVerification.createdAt)}
                </span>
              ) : (
                <span className="text-rose-600">Not verified</span>
              )}
            </div>
            {l.documents.map((d) => (
              <div key={d.id} className="flex justify-between">
                <span className="text-slate-500">{d.title}</span>
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Open
                </a>
              </div>
            ))}
          </div>

          <h4 className="font-bold text-slate-900">Auction terms</h4>
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Starting price</span>
              <strong>{money(s.startingPrice)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reserve price</span>
              <strong>{money(s.reservePrice)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Min. increment</span>
              <strong>{money(s.minBidIncrement)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Starts</span>
              <strong>{when(s.startAt)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ends (auto-closes)</span>
              <strong>{when(s.endAt)}</strong>
            </div>
            {s.terms && (
              <p className="border-t border-slate-200 pt-2 text-slate-600">
                {s.terms}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <h4 className="mb-2 font-bold text-slate-900">Pre-requirement check</h4>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {checklist.map((c) => (
            <li
              key={c.key}
              className={`flex items-center gap-2 ${c.ok ? "text-emerald-700" : "text-rose-600"}`}
            >
              {c.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {c.label}
              {c.detail && <span className="text-slate-400">({c.detail})</span>}
            </li>
          ))}
        </ul>
      </div>

      {msg && (
        <div
          className={`rounded-xl p-3 ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label className="mb-1 block font-semibold text-slate-700">
            Reason (required when rejecting)
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. National ID photo is blurry; video does not match the item"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-blue-600"
          />
        </div>
        <button
          type="button"
          disabled={isPending || reason.trim().length < 5}
          onClick={() => decide("REJECT")}
          className="rounded-xl border border-rose-200 px-5 py-2.5 font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={isPending || !confirmed || failed.length > 0}
          onClick={() => decide("APPROVE")}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          Approve and go live
        </button>
      </div>
      <label className="flex items-center gap-2 text-slate-600">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I opened the photos, video and ID document and checked the schedule.
      </label>
      {failed.length > 0 && (
        <p className="text-rose-600">
          Approval is disabled until every check passes. You can still reject
          with a reason.
        </p>
      )}
    </div>
  );
}
