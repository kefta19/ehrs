"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Smartphone, Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { initiateBidPaymentAction } from "@/app/actions/bid-payment";

type Auction = {
  id: string;
  type: "FORWARD" | "REVERSE";
  listing: {
    title: string;
    category: { name: string };
    city: string;
    images: Array<{ url: string }>;
  };
  startingPrice: number | string;
};

export function BidPaymentClient({
  auction,
  bidAmount,
  auctionType,
  bidBoundary,
  endAt,
  bidAmountUpdated,
}: {
  auction: Auction;
  bidAmount: number;
  auctionType: "FORWARD" | "REVERSE";
  bidBoundary: number;
  endAt: string;
  bidAmountUpdated: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(bidAmount);
  const [boundaryOverride, setBoundaryOverride] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selectedMethod, setSelectedMethod] = useState<"TELEBIRR" | "CHAPA" | "BANK_TRANSFER" | null>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentEvidenceUrl, setPaymentEvidenceUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isAuctionClosed = now >= new Date(endAt).getTime();
  const requiredBoundary = boundaryOverride ?? bidBoundary;

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const handlePayment = async () => {
    if (Date.now() >= new Date(endAt).getTime()) {
      setNow(Date.now());
      setError("This auction has ended. Bid payment can no longer be submitted.");
      return;
    }

    if (auctionType === "REVERSE" && requiredBoundary <= 0) {
      setError("No positive valid bid can be submitted for this reverse auction.");
      return;
    }

    const invalidBid =
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (auctionType === "REVERSE"
        ? amount > requiredBoundary
        : amount < requiredBoundary);
    if (invalidBid) {
      setAmount(requiredBoundary);
      setError(
        auctionType === "REVERSE"
          ? `The maximum valid bid changed. Your amount was updated to ${requiredBoundary.toLocaleString()} ETB.`
          : `The minimum valid bid changed. Your amount was updated to ${requiredBoundary.toLocaleString()} ETB.`,
      );
      return;
    }

    if (!selectedMethod) {
      setError("Please select a payment method");
      return;
    }

    if (!paymentEvidenceUrl.trim()) {
      setError("Please provide a URL to your payment evidence.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("auctionId", auction.id);
      formData.append("bidAmount", amount.toString());
      formData.append("method", selectedMethod);
      formData.append("transactionRef", transactionRef);
      formData.append("bankReferenceUrl", paymentEvidenceUrl.trim());

      const result = await initiateBidPaymentAction(formData);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/buyer?tab=bids");
        }, 3000);
      } else {
        if (
          "bidBoundary" in result &&
          typeof result.bidBoundary === "number"
        ) {
          const updatedBoundary = result.bidBoundary;
          setBoundaryOverride(updatedBoundary);
          if (auctionType !== "REVERSE" || updatedBoundary > 0) {
            setAmount((current) =>
              auctionType === "REVERSE"
                ? Math.min(current, updatedBoundary)
                : Math.max(current, updatedBoundary),
            );
          }
        }
        setError(result.error || "Payment submission failed. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Submitted!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your bid payment of {amount.toLocaleString()} ETB has been submitted for admin review.
            You will be notified once approved.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (isAuctionClosed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-slate-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertCircle className="h-9 w-9 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Auction deadline reached
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Bid payment is no longer available because this auction has ended.
            Refresh to check whether the auction deadline was extended.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Refresh auction
            </button>
            <button
              type="button"
              onClick={() => router.push("/customer?tab=browse")}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Return to auctions
            </button>
          </div>
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
            <h1 className="text-2xl font-bold text-white">Bid Payment</h1>
            <p className="text-blue-100 mt-1">Complete payment to place your bid</p>
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
                </div>
              </div>
            </div>

            {/* Bid Amount */}
            <div className="mb-6">
              <label
                htmlFor="bid-amount"
                className="mb-2 block text-center text-sm text-slate-600 dark:text-slate-400"
              >
                Your Bid Amount
              </label>
              <div className="mx-auto flex max-w-sm items-center rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-600 dark:bg-slate-900">
                <input
                  id="bid-amount"
                  type="number"
                  min={auctionType === "REVERSE" ? 0.01 : requiredBoundary}
                  max={auctionType === "REVERSE" ? requiredBoundary : undefined}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => {
                    setAmount(Number(event.target.value));
                    setError(null);
                  }}
                  className="w-full min-w-0 bg-transparent py-3 text-center text-3xl font-bold text-slate-900 outline-none dark:text-white"
                  aria-describedby="bid-minimum"
                />
                <span className="shrink-0 text-sm text-slate-500">ETB</span>
              </div>
              <p
                id="bid-minimum"
                className="mt-2 text-center text-xs text-slate-500"
              >
                {auctionType === "REVERSE" ? "Maximum valid bid" : "Minimum valid bid"}:{" "}
                {requiredBoundary.toLocaleString()} ETB
              </p>
              {bidAmountUpdated && (
                <p className="mt-2 text-center text-sm font-medium text-amber-700 dark:text-amber-300">
                  {auctionType === "REVERSE"
                    ? "The current maximum changed, so your bid amount was adjusted. You can change it as long as it does not exceed the maximum."
                    : "The current minimum increased, so your bid was automatically updated. You can change it as long as it meets the minimum."}
                </p>
              )}
            </div>

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

            {/* Payment Evidence URL */}
            {selectedMethod && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Payment Evidence URL (HTTPS)
                </label>
                <input
                  type="url"
                  value={paymentEvidenceUrl}
                  onChange={(e) => setPaymentEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  Paste a secure link to the receipt or transaction confirmation for admin verification.
                </p>
              </div>
            )}

            {/* Transaction Reference */}
            {selectedMethod && selectedMethod !== "BANK_TRANSFER" && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Transaction Reference (Optional)
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Enter transaction reference"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
            )}

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
                disabled={!selectedMethod || isProcessing}
                className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Submit Payment"
                )}
              </button>
            </div>

            {/* Info */}
            <p className="text-xs text-slate-500 dark:text-slate-500 text-center mt-4">
              This submits payment evidence for admin review. Your bid becomes active only after approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
