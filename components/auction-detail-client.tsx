"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  placeBidAction,
  submitAuctionInquiryAction,
} from "@/app/actions/buyer";
import {
  BadgeCheck,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  FileCheck2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  User,
  Video,
  Loader2,
  X,
} from "lucide-react";

interface AuctionDetail {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  startingPrice: number | string;
  currentHighestBid: number | string;
  minBidIncrement: number | string;
  terms: string | null;
  listing: {
    id: string;
    title: string;
    description: string;
    condition: string;
    address: string | null;
    city: string;
    region: string;
    country: string;
    referenceNumber: string | null;
    features: string[];
    attributes: Record<string, unknown> | null;
    videoUrl: string | null;
    images: { id: string; url: string }[];
    category: { name: string };
    seller: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      sellerProfile: {
        businessName: string | null;
        status: string;
      } | null;
    };
  };
  bids: {
    id: string;
    amount: number | string;
    createdAt: string;
    bidder: { name: string };
  }[];
}

interface CurrentUser {
  id: string;
  role: string;
  email: string;
}

interface AuctionDetailClientProps {
  auction: AuctionDetail;
  user: CurrentUser | null;
  hasPaidEntranceFee: boolean;
  entranceFee: {
    status?: string;
    paymentProofUrl?: string | null;
    note?: string | null;
  } | null;
}

export function AuctionDetailClient({
  auction,
  user,
  hasPaidEntranceFee,
  entranceFee,
}: AuctionDetailClientProps) {
  const router = useRouter();
  const [bidAmount, setBidAmount] = useState("");
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [inquiryText, setInquiryText] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePayEntranceFee = () => {
    if (!user) {
      router.push(`/login?redirect=/auction/${auction.id}`);
      return;
    }
    router.push(`/payment/entry-fee?auctionId=${auction.id}`);
  };
  
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/login?redirect=/auction/${auction.id}`);
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
      router.refresh();
    } else if (result.error === "ENTRANCE_FEE_REQUIRED") {
      // Redirect to entrance fee payment page
      router.push(`/payment/entry-fee?auctionId=${auction.id}`);
    } else if (result.error === "BID_PAYMENT_REQUIRED") {
      // Redirect to bid payment page
      const bidAmount = formData.get("amount");
      router.push(`/payment/bid?auctionId=${auction.id}&bidAmount=${bidAmount}`);
    } else {
      setMessage({ type: "error", text: result.error || "Failed to place bid" });
    }

    setIsPlacingBid(false);
  };

  const handleSendInquiry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSendingInquiry(true);
    setInquiryMessage(null);

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    formData.set("auctionId", auction.id);
    const result = await submitAuctionInquiryAction(formData);
    if (result.success) {
      setInquiryMessage({
        type: "success",
        text: result.message ?? "Your inquiry was sent to the seller.",
      });
      setInquiryText("");
    } else {
      setInquiryMessage({
        type: "error",
        text: result.error ?? "Your inquiry could not be sent.",
      });
    }
    if (result.success) formElement.reset();
    setIsSendingInquiry(false);
  };

  const now = new Date();
  const isActive = auction.status === "ACTIVE";
  const isScheduled = auction.status === "SCHEDULED";
  const hasStarted = now >= new Date(auction.startAt);
  const hasEnded = now >= new Date(auction.endAt);

  const formatTime = (date: Date | string) => {
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
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : isScheduled ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}>
                {auction.status}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {auction.listing.category.name}
              </span>
              {auction.listing.seller.sellerProfile?.status === "APPROVED" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  <BadgeCheck size={14} /> Seller verified
                </span>
              )}
            </div>
            {user?.role === "BUYER" && (
              <button
                type="button"
                onClick={() => router.push("/buyer?tab=browse")}
                aria-label="Close auction details and return to browse"
                title="Close details"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {auction.listing.title}
          </h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <MapPin size={16} className="shrink-0 text-blue-600" />
            {auction.listing.city}, {auction.listing.region}, {auction.listing.country}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Listing photos</h2>
                {auction.listing.images.length > 1 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Scroll to see all photos</span>
                )}
              </div>
              {auction.listing.images.length > 0 ? (
                <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
                  {auction.listing.images.map((image) => (
                    <a
                      key={image.id}
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative h-64 w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-80 sm:w-[72%]"
                      aria-label={`Open full-size photo of ${auction.listing.title}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={`${auction.listing.title} photo`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white">
                        Open full image
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 py-16 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  No photos are available for this listing.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Full listing description</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
                {auction.listing.description}
              </p>
              {auction.listing.videoUrl && (
                <a
                  href={auction.listing.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Video size={17} /> Open listing video
                </a>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Asset information</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {[auction.listing.address, auction.listing.city, auction.listing.region, auction.listing.country].filter(Boolean).join(", ")}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{auction.listing.category.name}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Condition</dt>
                  <dd className="mt-1 text-sm font-medium capitalize text-slate-900 dark:text-white">
                    {auction.listing.condition.replaceAll("_", " ").toLowerCase()}
                  </dd>
                </div>
                {auction.listing.referenceNumber && (
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{auction.listing.referenceNumber}</dd>
                  </div>
                )}
              </dl>
              {auction.listing.features.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Features</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {auction.listing.features.map((feature) => (
                      <span key={feature} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">{feature}</span>
                    ))}
                  </div>
                </div>
              )}
              {auction.listing.attributes && Object.keys(auction.listing.attributes).length > 0 && (
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {Object.entries(auction.listing.attributes).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                      <dt className="text-xs text-slate-500">{key.replaceAll("_", " ")}</dt>
                      <dd className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-200">
                        {typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                          ? String(value)
                          : JSON.stringify(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900 dark:bg-blue-950/30">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-300" size={20} />
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">Seller privacy and document review</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    The seller&apos;s identity is reviewed by the platform. National ID numbers, ID files, and ownership documents are private and are not shared with buyers.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bid history</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {auction.bids.length} {auction.bids.length === 1 ? "bid" : "bids"} · Other bidders are anonymized.
              </p>
              {auction.bids.length > 0 ? (
                <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {auction.bids.map((bid) => (
                    <div key={bid.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{bid.bidder.name}</span>
                        <time className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400" dateTime={bid.createdAt}>
                          {formatTime(bid.createdAt)}
                        </time>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">${Number(bid.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No bids yet. Be the first to participate.</p>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Auction overview</h2>
              <dl className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign size={18} className="mt-0.5 text-blue-600" />
                  <div>
                    <dt className="text-xs text-slate-500">Current bid</dt>
                    <dd className="font-bold text-slate-900 dark:text-white">
                      {currentBid > 0 ? `$${currentBid.toLocaleString()}` : `$${startingPrice.toLocaleString()} starting`}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign size={18} className="mt-0.5 text-blue-600" />
                  <div>
                    <dt className="text-xs text-slate-500">Minimum increment</dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-200">${minBidIncrement.toLocaleString()}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="mt-0.5 text-blue-600" />
                  <div>
                    <dt className="text-xs text-slate-500">Auction starts</dt>
                    <dd className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatTime(auction.startAt)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock size={18} className="mt-0.5 text-blue-600" />
                  <div>
                    <dt className="text-xs text-slate-500">Auction ends</dt>
                    <dd className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {hasEnded ? "Auction ended" : hasStarted ? `${hoursLeft}h ${minutesLeft}m remaining` : formatTime(auction.endAt)}
                    </dd>
                  </div>
                </div>
              </dl>
              {auction.terms && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Auction rules and terms</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{auction.terms}</p>
                </div>
              )}
            </section>

            {/* Entrance Fee */}
            {!hasPaidEntranceFee && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
                <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-amber-900 dark:text-amber-200">
                  <Lock className="h-5 w-5" />
                  Participation requirements
                </h2>
                {entranceFee?.status === "PENDING" ? (
                  <div className="space-y-2 text-sm text-amber-900 dark:text-amber-200">
                    <p>Your payment proof is under review. Bidding and seller inquiries unlock after approval.</p>
                    {entranceFee.paymentProofUrl && (
                      <a href={entranceFee.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="block underline">
                        View submitted payment proof
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="mb-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
                      Complete the auction entrance-fee requirement. Bidding and seller inquiries become available after payment is verified.
                    </p>
                    {entranceFee?.status === "REJECTED" && (
                      <p className="mb-4 text-sm text-rose-700 dark:text-rose-300">
                        Previous proof rejected{entranceFee.note ? `: ${entranceFee.note}` : "."} Please resubmit with a valid receipt.
                      </p>
                    )}
                    <button
                      onClick={handlePayEntranceFee}
                      className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                    >
                      {entranceFee?.status === "REJECTED" ? "Resubmit Payment Proof" : "Pay Entrance Fee"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Seller Contact - Only shown if authenticated and paid entrance fee */}
            {user?.role === "BUYER" && hasPaidEntranceFee && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Contact the seller</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your email is included with your inquiry.</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <User size={20} />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <User size={17} className="mt-0.5 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{auction.listing.seller.name}</p>
                      {auction.listing.seller.sellerProfile?.businessName && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Building2 size={13} /> {auction.listing.seller.sellerProfile.businessName}
                        </p>
                      )}
                    </div>
                  </div>
                  {auction.listing.seller.email && (
                    <a
                      href={`mailto:${auction.listing.seller.email}`}
                      className="flex items-center gap-3 break-all text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
                    >
                      <Mail size={17} className="shrink-0" /> {auction.listing.seller.email}
                    </a>
                  )}
                  {auction.listing.seller.phone && (
                    <a
                      href={`tel:${auction.listing.seller.phone}`}
                      className="flex items-center gap-3 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
                    >
                      <Phone size={17} className="shrink-0" /> {auction.listing.seller.phone}
                    </a>
                  )}
                  {auction.listing.seller.sellerProfile?.status === "APPROVED" && (
                    <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <FileCheck2 size={16} /> Seller identity verified by the platform
                    </p>
                  )}
                </div>

                <form onSubmit={handleSendInquiry} className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <label htmlFor="seller-inquiry" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Send an inquiry
                  </label>
                  <textarea
                    id="seller-inquiry"
                    name="message"
                    value={inquiryText}
                    onChange={(event) => setInquiryText(event.target.value)}
                    minLength={10}
                    maxLength={2000}
                    required
                    rows={4}
                    placeholder="Ask the seller a question about this listing..."
                    className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/50"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    10–2,000 characters. Your account email ({user.email}) will be included.
                  </p>
                  <button
                    type="submit"
                    disabled={isSendingInquiry}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSendingInquiry ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {isSendingInquiry ? "Sending inquiry..." : "Send inquiry"}
                  </button>
                  {inquiryMessage && (
                    <p
                      role="status"
                      className={`mt-3 rounded-xl p-3 text-sm ${
                        inquiryMessage.type === "success"
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {inquiryMessage.text}
                    </p>
                  )}
                </form>
              </section>
            )}

            {/* Place Bid Form */}
            {user?.role === "BUYER" && hasPaidEntranceFee && isActive && !hasEnded && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Place your bid</h2>
                <form onSubmit={handlePlaceBid} className="space-y-4">
                  <div>
                    <label htmlFor="bidAmount" className="mb-1 mt-4 block text-sm font-medium text-slate-800 dark:text-slate-200">
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Minimum bid: ${minRequired.toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
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
                  <div role="status" className={`mt-4 rounded-xl p-3 ${
                    message.type === "error" ? "bg-red-50 border border-red-200 text-red-800" : "bg-green-50 border border-green-200 text-green-800"
                  }`}>
                    {message.text}
                  </div>
                )}
              </section>
            )}

            {!user && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Sign in and complete the auction participation requirements to contact the seller or place a bid.
                </p>
                <button
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                  onClick={() => router.push(`/login?redirect=/auction/${auction.id}`)}
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
