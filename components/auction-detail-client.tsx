"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { placeBidAction } from "@/app/actions/buyer";
import {
  payBuyerEntranceFeeAction,
  getAuctionEntranceFeeAction,
} from "@/app/actions/bid-registration";
import { Loader2, User, Mail, Phone, MapPin, Calendar, Clock, DollarSign, Lock } from "lucide-react";

interface AuctionDetailClientProps {
  auction: any;
  user: any;
  hasPaidEntranceFee: boolean;
  entranceFee: any;
}

export function AuctionDetailClient({
  auction,
  user,
  hasPaidEntranceFee,
  entranceFee,
}: AuctionDetailClientProps) {
  const [bidAmount, setBidAmount] = useState("");
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showEntranceFeeForm, setShowEntranceFeeForm] = useState(false);
  const [entranceFeeData, setEntranceFeeData] = useState<{ feeAmount: number; currency: string; auctionTitle: string } | null>(null);
  const [isPayingEntranceFee, setIsPayingEntranceFee] = useState(false);
  const [txRef, setTxRef] = useState("");
  const [entranceFeeMessage, setEntranceFeeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePayEntranceFee = async () => {
    if (!user) {
      redirect("/login?redirect=/auction/" + auction.id);
      return;
    }

    setIsPayingEntranceFee(true);
    setEntranceFeeMessage(null);

    const result = await getAuctionEntranceFeeAction(auction.id);

    if (result.success) {
      setEntranceFeeData(result);
      setShowEntranceFeeForm(true);
    } else {
      setEntranceFeeMessage({ type: "error", text: result.error || "Failed to get entrance fee" });
    }

    setIsPayingEntranceFee(false);
  };

  const handleSubmitEntranceFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !entranceFeeData) return;

    setIsPayingEntranceFee(true);
    setEntranceFeeMessage(null);

    const formData = new FormData();
    formData.append("auctionId", auction.id);
    formData.append("txRef", txRef);
    formData.append("feeAmount", entranceFeeData.feeAmount.toString());

    const result = await payBuyerEntranceFeeAction(formData);

    if (result.success) {
      setEntranceFeeMessage({ type: "success", text: result.message });
      setShowEntranceFeeForm(false);
      setTxRef("");
      // Refresh the page to update entrance fee status
      window.location.reload();
    } else {
      setEntranceFeeMessage({ type: "error", text: result.error || "Failed to submit payment" });
    }

    setIsPayingEntranceFee(false);
  };
  
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      redirect("/login?redirect=/auction/" + auction.id);
      return;
    }

    if (!hasPaidEntranceFee) {
      setMessage({ type: "error", text: "You must pay the entrance fee before placing a bid." });
      return;
    }

    setIsPlacingBid(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("auctionId", auction.id);
    formData.append("amount", bidAmount);

    const result = await placeBidAction(formData);

    if (result.success) {
      setMessage({ type: "success", text: result.message || "Bid placed successfully" });
      setBidAmount("");
    } else {
      setMessage({ type: "error", text: result.error || "Failed to place bid" });
    }

    setIsPlacingBid(false);
  };

  const now = new Date();
  const isActive = auction.status === "ACTIVE";
  const isScheduled = auction.status === "SCHEDULED";
  const hasStarted = now >= new Date(auction.startAt);
  const hasEnded = now >= new Date(auction.endAt);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const timeLeft = Math.max(0, new Date(auction.endAt).getTime() - now.getTime());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const currentBid = Number(auction.currentHighestBid);
  const startingPrice = Number(auction.startingPrice);
  const minBidIncrement = Number(auction.minBidIncrement);
  const minRequired = currentBid > 0 ? currentBid + minBidIncrement : startingPrice;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            isActive ? "bg-green-600 text-white" : isScheduled ? "bg-blue-600 text-white" : "bg-slate-600 text-white"
          }`}>
            {auction.status}
          </span>
          <h1 className="mt-4 text-4xl font-bold">{auction.listing.title}</h1>
          <p className="mt-2 text-lg text-slate-600">{auction.listing.description}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Photos</h2>
              {auction.listing.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {auction.listing.images.map((image: any) => (
                    <img
                      key={image.id}
                      src={image.url}
                      alt={auction.listing.title}
                      className="rounded-lg object-cover w-full h-48"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No images available</p>
              )}
            </div>

            {/* Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Property Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-slate-500" />
                  <span>{auction.listing.city}, {auction.listing.region}, {auction.listing.country}</span>
                </div>
                {auction.listing.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-slate-500" />
                    <span>{auction.listing.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-500" />
                  <span>Category: {auction.listing.category.name}</span>
                </div>
                {auction.listing.referenceNumber && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Reference:</span>
                    <span>{auction.listing.referenceNumber}</span>
                  </div>
                )}
                {auction.listing.features && auction.listing.features.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {auction.listing.features.map((feature: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 rounded text-sm">{feature}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bidding History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Bidding History</h2>
              {auction.bids.length > 0 ? (
                <div className="space-y-2">
                  {auction.bids.map((bid: any) => (
                    <div key={bid.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className="font-medium">{bid.bidder.name}</span>
                      <span className="text-lg font-bold">${Number(bid.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No bids yet</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Auction Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Auction Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    isActive ? "bg-green-600 text-white" : isScheduled ? "bg-blue-600 text-white" : "bg-slate-600 text-white"
                  }`}>
                    {auction.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-slate-500" />
                  <span>
                    {hasEnded ? "Auction ended" : hasStarted ? `Ends in ${hoursLeft}h ${minutesLeft}m` : `Starts ${formatTime(auction.startAt)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-slate-500" />
                  <span>Starting Price: ${startingPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-slate-500" />
                  <span>Current Bid: ${currentBid > 0 ? currentBid.toLocaleString() : "No bids yet"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-slate-500" />
                  <span>Min Increment: ${minBidIncrement.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Entrance Fee */}
            {!hasPaidEntranceFee && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-2 text-amber-800 flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Entrance Fee Required
                </h2>
                <p className="text-sm text-amber-700 mb-4">
                  You must pay the entrance fee to participate in this auction and view seller contact information.
                </p>
                {!showEntranceFeeForm ? (
                  <button
                    onClick={handlePayEntranceFee}
                    disabled={isPayingEntranceFee}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
                  >
                    {isPayingEntranceFee ? (
                      <>
                        <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Pay Entrance Fee"
                    )}
                  </button>
                ) : (
                  <form onSubmit={handleSubmitEntranceFee} className="space-y-3">
                    {entranceFeeData && (
                      <div className="bg-white p-3 rounded border border-amber-200">
                        <p className="text-sm font-medium text-amber-900">
                          {entranceFeeData.auctionTitle}
                        </p>
                        <p className="text-lg font-bold text-amber-800">
                          {entranceFeeData.currency} {entranceFeeData.feeAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <label htmlFor="txRef" className="block text-sm font-medium mb-1 text-amber-900">
                        Transaction Reference
                      </label>
                      <input
                        id="txRef"
                        type="text"
                        value={txRef}
                        onChange={(e) => setTxRef(e.target.value)}
                        placeholder="Enter your bank transaction reference"
                        required
                        className="w-full px-3 py-2 border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isPayingEntranceFee}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
                    >
                      {isPayingEntranceFee ? (
                        <>
                          <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Payment"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEntranceFeeForm(false)}
                      className="w-full bg-transparent text-amber-700 hover:text-amber-800 font-semibold py-2 px-4 rounded"
                    >
                      Cancel
                    </button>
                  </form>
                )}
                {entranceFeeMessage && (
                  <div className={`mt-4 p-3 rounded ${
                    entranceFeeMessage.type === "error" ? "bg-red-50 border border-red-200 text-red-800" : "bg-green-50 border border-green-200 text-green-800"
                  }`}>
                    {entranceFeeMessage.text}
                  </div>
                )}
              </div>
            )}

            {/* Seller Contact - Only shown if authenticated and paid entrance fee */}
            {user && hasPaidEntranceFee && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Seller Contact</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-slate-500" />
                    <span className="font-medium">{auction.listing.seller.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-slate-500" />
                    <a href={`mailto:${auction.listing.seller.email}`} className="text-blue-600 hover:underline">
                      {auction.listing.seller.email}
                    </a>
                  </div>
                  {auction.listing.seller.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-slate-500" />
                      <a href={`tel:${auction.listing.seller.phone}`} className="text-blue-600 hover:underline">
                        {auction.listing.seller.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Place Bid Form */}
            {user && hasPaidEntranceFee && isActive && !hasEnded && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Place Your Bid</h2>
                <form onSubmit={handlePlaceBid} className="space-y-4">
                  <div>
                    <label htmlFor="bidAmount" className="block text-sm font-medium mb-1">
                      Bid Amount (USD)
                    </label>
                    <input
                      id="bidAmount"
                      type="number"
                      step="0.01"
                      min={minRequired}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`Minimum: $${minRequired.toLocaleString()}`}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Minimum bid: ${minRequired.toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
                    disabled={isPlacingBid}
                  >
                    {isPlacingBid ? (
                      <>
                        <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                        Placing Bid...
                      </>
                    ) : (
                      "Place Bid"
                    )}
                  </button>
                </form>
                {message && (
                  <div className={`mt-4 p-3 rounded ${
                    message.type === "error" ? "bg-red-50 border border-red-200 text-red-800" : "bg-green-50 border border-green-200 text-green-800"
                  }`}>
                    {message.text}
                  </div>
                )}
              </div>
            )}

            {!user && (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-slate-600 mb-4">
                  Sign in to place bids and view seller contact information.
                </p>
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
                  onClick={() => redirect("/login")}
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
