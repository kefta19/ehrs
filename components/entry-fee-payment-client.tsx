"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { payBuyerEntranceFeeAction } from "@/app/actions/bid-registration";

type Auction = {
  id: string;
  listing: {
    title: string;
    category: { name: string };
    city: string;
    images?: Array<{ url?: string | null }>;
  };
  startingPrice: number | string;
};

export type ExistingRegistration = {
  id: string;
  status: string;
  paymentMethod?: string | null;
  paymentProofUrl?: string | null;
  txRef?: string | null;
  note?: string | null;
};

export function EntryFeePaymentClient({
  auction,
  entryFeeAmount,
  existingRegistration,
  embedded = false,
  onCancel,
}: {
  auction: Auction;
  entryFeeAmount: number;
  existingRegistration: ExistingRegistration | null;
  embedded?: boolean;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<
    "TELEBIRR" | "CHAPA" | "BANK_TRANSFER"
  >(
    (existingRegistration?.paymentMethod as
      | "TELEBIRR"
      | "CHAPA"
      | "BANK_TRANSFER") || "BANK_TRANSFER",
  );
  const [txRef, setTxRef] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const returnToDashboard = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/buyer?tab=browse");
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      setError("Please select a payment method");
      return;
    }
    if (txRef.trim().length < 4 || !proofUrl.trim()) {
      setError(
        "Enter the transaction reference and a link to your payment receipt.",
      );
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("auctionId", auction.id);
      formData.append("method", selectedMethod);
      formData.append("txRef", txRef.trim());
      formData.append("paymentProofUrl", proofUrl.trim());

      const result = await payBuyerEntranceFeeAction(formData);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Payment failed. Please try again.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit payment proof.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div
        className={
          embedded
            ? "w-full"
            : "flex min-h-screen items-center justify-center bg-background p-4"
        }
      >
        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Submitted for admin review
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your payment details are submitted. Bidding will unlock after
            verification.
          </p>
          <button
            onClick={returnToDashboard}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Return to buyer dashboard
          </button>
        </div>
      </div>
    );
  }

  if (existingRegistration?.status === "PENDING") {
    return (
      <div
        className={
          embedded
            ? "w-full"
            : "flex min-h-screen items-center justify-center bg-background p-4"
        }
      >
        <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-9 w-9 text-amber-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-slate-900 dark:text-white">
            Payment under review
          </h1>
          <p className="mt-2 text-center text-slate-600 dark:text-slate-300">
            Bidding unlocks after an administrator approves your entrance fee.
          </p>
          <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p>Transaction reference: {existingRegistration.txRef || "—"}</p>
            <p>Payment method: {existingRegistration.paymentMethod || "—"}</p>
            {existingRegistration.paymentProofUrl && (
              <a
                href={existingRegistration.paymentProofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                View submitted receipt
              </a>
            )}
          </div>
          <button
            onClick={returnToDashboard}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to auctions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        embedded ? "w-full" : "min-h-screen bg-background px-4 py-4 sm:py-8"
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 bg-blue-700 px-4 py-3.5 text-white sm:px-5">
            <div>
              <h1 className="text-lg font-bold">Pay Entrance Fee</h1>
              <p className="mt-0.5 text-xs text-blue-100">
                Submit payment details to bid in this auction.
              </p>
            </div>
            {embedded && (
              <button
                type="button"
                onClick={returnToDashboard}
                className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Back
              </button>
            )}
          </div>

          <div className="p-4 sm:p-5">
            {/* Auction Summary */}
            <div className="mb-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <img
                  src={auction.listing.images?.[0]?.url || "/placeholder.jpg"}
                  alt={auction.listing.title}
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {auction.listing.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {auction.listing.category.name} · {auction.listing.city}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Starting price:{" "}
                    {Number(auction.startingPrice).toLocaleString()} ETB
                  </p>
                </div>
              </div>
            </div>

            {/* Fee Amount */}
            <div className="text-center mb-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Entrance fee
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ETB {entryFeeAmount.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                1% of starting price · minimum 100 ETB
              </p>
            </div>
            {existingRegistration?.status === "REJECTED" && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Your previous submission was rejected
                {existingRegistration.note
                  ? `: ${existingRegistration.note}`
                  : "."}{" "}
                Submit a new reference and receipt for review.
              </div>
            )}

            {/* Payment Methods */}
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold text-slate-900 dark:text-white">
                Payment method
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  aria-pressed={selectedMethod === "TELEBIRR"}
                  onClick={() => setSelectedMethod("TELEBIRR")}
                  className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                    selectedMethod === "TELEBIRR"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Smartphone className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Telebirr
                  </span>
                  {selectedMethod === "TELEBIRR" && (
                    <CheckCircle className="ml-auto h-4 w-4 text-blue-600" />
                  )}
                </button>

                <button
                  type="button"
                  aria-pressed={selectedMethod === "CHAPA"}
                  onClick={() => setSelectedMethod("CHAPA")}
                  className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                    selectedMethod === "CHAPA"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Chapa
                  </span>
                  {selectedMethod === "CHAPA" && (
                    <CheckCircle className="ml-auto h-4 w-4 text-blue-600" />
                  )}
                </button>

                <button
                  type="button"
                  aria-pressed={selectedMethod === "BANK_TRANSFER"}
                  onClick={() => setSelectedMethod("BANK_TRANSFER")}
                  className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                    selectedMethod === "BANK_TRANSFER"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Bank transfer
                  </span>
                  {selectedMethod === "BANK_TRANSFER" && (
                    <CheckCircle className="ml-auto h-4 w-4 text-blue-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Transaction reference
                <input
                  value={txRef}
                  onChange={(event) => setTxRef(event.target.value)}
                  minLength={4}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  placeholder="Reference from your payment provider"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Payment receipt/proof URL (HTTPS)
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(event) => setProofUrl(event.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  placeholder="https://..."
                />
              </label>
              <p className="col-span-full text-[11px] text-slate-500">
                Use an HTTPS receipt link. Verification is required before
                bidding.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={returnToDashboard}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? "Submitting..." : "Submit payment for review"}
              </button>
            </div>

            {/* Info */}
            <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
              Bidding unlocks after payment verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
