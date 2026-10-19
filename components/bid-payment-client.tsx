"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Smartphone, Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { initiateBidPaymentAction } from "@/app/actions/bid-payment";

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

type User = {
  id: string;
  name: string;
  email: string;
};

export function BidPaymentClient({
  user,
  auction,
  bidAmount,
}: {
  user: User;
  auction: Auction;
  bidAmount: number;
}) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<"TELEBIRR" | "CHAPA" | "BANK_TRANSFER" | null>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentEvidenceUrl, setPaymentEvidenceUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
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
      formData.append("bidAmount", bidAmount.toString());
      formData.append("method", selectedMethod);
      formData.append("transactionRef", transactionRef);
      formData.append("bankReferenceUrl", paymentEvidenceUrl.trim());

      const result = await initiateBidPaymentAction(formData);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/buyer");
        }, 3000);
      } else {
        setError(result.error || "Payment submission failed. Please try again.");
      }
    } catch (err) {
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
            Your bid payment of ${bidAmount.toLocaleString()} ETB has been submitted for admin review.
            You will be notified once approved.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">Redirecting to dashboard...</p>
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
            <div className="text-center mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Your Bid Amount</p>
              <p className="text-4xl font-bold text-slate-900 dark:text-white">
                ${bidAmount.toLocaleString()} <span className="text-lg font-normal text-slate-500">ETB</span>
              </p>
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
              Your payment will be reviewed by admin. Once approved, your bid will be placed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
