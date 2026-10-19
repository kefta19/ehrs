"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Smartphone, Building2, CheckCircle, AlertCircle } from "lucide-react";
import { payBuyerEntranceFeeAction } from "@/app/actions/bid-registration";

type Auction = {
  id: string;
  listing: {
    title: string;
    category: { name: string };
    city: string;
    images: Array<{ url: string }>;
  };
  startingPrice: number | string;
};

type ExistingRegistration = {
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
}: {
  auction: Auction;
  entryFeeAmount: number;
  existingRegistration: ExistingRegistration | null;
}) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<"TELEBIRR" | "CHAPA" | "BANK_TRANSFER">(
    (existingRegistration?.paymentMethod as "TELEBIRR" | "CHAPA" | "BANK_TRANSFER") || "BANK_TRANSFER"
  );
  const [txRef, setTxRef] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    if (!selectedMethod) {
      setError("Please select a payment method");
      return;
    }
    if (txRef.trim().length < 4 || !proofUrl.trim()) {
      setError("Enter the transaction reference and a link to your payment receipt.");
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
      setError(err instanceof Error ? err.message : "Unable to submit payment proof.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Submitted for admin review</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your receipt and transaction reference have been submitted. You can place or increase bids after an administrator verifies the payment.
          </p>
          <button
            onClick={() => router.push(`/buyer?tab=browse`)}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Return to buyer dashboard
          </button>
        </div>
      </div>
    );
  }

  if (existingRegistration?.status === "PENDING") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-9 w-9 text-amber-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white">Payment under review</h1>
          <p className="mt-2 text-center text-slate-600 dark:text-slate-300">
            Bidding is enabled only after an administrator approves your entrance fee.
          </p>
          <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p>Transaction reference: {existingRegistration.txRef || "—"}</p>
            <p>Payment method: {existingRegistration.paymentMethod || "—"}</p>
            {existingRegistration.paymentProofUrl && (
              <a href={existingRegistration.paymentProofUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                View submitted receipt
              </a>
            )}
          </div>
          <button onClick={() => router.push("/buyer?tab=browse")} className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
            Return to buyer dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
            <h1 className="text-2xl font-bold text-white">Pay Entrance Fee</h1>
            <p className="text-blue-100 mt-1">Complete payment to participate in this auction</p>
          </div>

          <div className="p-6">
            {/* Auction Summary */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex gap-4">
                <img
                  src={auction.listing.images[0]?.url || "/placeholder.jpg"}
                  alt={auction.listing.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{auction.listing.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {auction.listing.category.name} • {auction.listing.city}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Starting Price: ${Number(auction.startingPrice).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Fee Amount */}
            <div className="text-center mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Entrance Fee Amount</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white">
                ETB {entryFeeAmount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">1% of starting price (minimum 100 ETB)</p>
            </div>
            {existingRegistration?.status === "REJECTED" && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Your previous submission was rejected{existingRegistration.note ? `: ${existingRegistration.note}` : "."} Submit a new reference and receipt for review.
              </div>
            )}

            {/* Payment Methods */}
            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Select Payment Method</h3>
              
              <button
                onClick={() => setSelectedMethod("TELEBIRR")}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === "TELEBIRR"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Telebirr</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pay via Telebirr mobile money</p>
                </div>
                {selectedMethod === "TELEBIRR" && (
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                )}
              </button>

              <button
                onClick={() => setSelectedMethod("CHAPA")}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === "CHAPA"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Chapa</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pay via Chapa payment gateway</p>
                </div>
                {selectedMethod === "CHAPA" && (
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                )}
              </button>

              <button
                onClick={() => setSelectedMethod("BANK_TRANSFER")}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === "BANK_TRANSFER"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Bank Transfer</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Direct bank transfer</p>
                </div>
                {selectedMethod === "BANK_TRANSFER" && (
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                )}
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Transaction reference
                <input
                  value={txRef}
                  onChange={(event) => setTxRef(event.target.value)}
                  minLength={4}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900"
                  placeholder="Reference from your payment provider"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Payment receipt/proof URL (HTTPS)
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(event) => setProofUrl(event.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900"
                  placeholder="https://..."
                />
              </label>
              <p className="text-xs text-slate-500">
                Upload the receipt to a secure file-sharing service and paste its HTTPS link. Admin verification is required before bidding.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? "Submitting..." : "Submit payment for review"}
              </button>
            </div>

            {/* Info */}
            <p className="text-xs text-slate-500 dark:text-slate-500 text-center mt-4">
              Your bid access will remain locked until an administrator verifies your payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
