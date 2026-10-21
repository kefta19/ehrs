"use client";

import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  PackagePlus,
  Gavel,
  ShieldCheck,
  CreditCard,
  BarChart3,
  Bell,
  Users,
  Award,
  Clock,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  Send,
  DollarSign,
  Plus,
  FileText,
  Upload,
  Calendar,
  Eye,
  Check,
  Menu,
  Trash2,
  UserRound,
  Edit,
} from "lucide-react";
import { ETHomeLogo } from "./ethome-brand";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import { PaymentMethodDialog } from "./payment-method-dialog";
import { WorkflowSuccessDialog } from "./workflow-success-dialog";
import { AnimatedInput } from "./animated-input";
import {
  submitSellerKycAction,
  cancelAuctionAction,
  replyToBuyerInquiryAction,
} from "@/app/actions/seller";
import {
  deleteNotificationAction,
  markNotificationReadAction,
} from "@/app/actions/buyer";
import { ListingWizard } from "./listing-wizard";
import { auctionStatusMeta, listingStatusMeta, TONE_CLASS } from "@/lib/status-labels";
import { AccountManagement } from "@/components/account-management";
import { deleteListingAction, updateListingAction } from "@/app/actions/listing";
import { useRouter } from "next/navigation";

type SellerUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  [key: string]: unknown;
};

function getInquiryTicketId(notification: Notification) {
  if (notification.type !== "AUCTION_INQUIRY" || !notification.link) return null;
  try {
    return new URL(notification.link, "https://notifications.invalid")
      .searchParams.get("inquiryId");
  } catch {
    return null;
  }
}

type SellerProfile = {
  status?: string;
  nationalIdNumber?: string;
  businessName?: string;
  taxId?: string;
  address?: string;
  idDocumentUrl?: string;
  [key: string]: unknown;
};

type ListingCategory = {
  id?: string;
  name?: string;
  slug?: string;
  [key: string]: unknown;
};

type ListingImage = {
  url?: string;
  [key: string]: unknown;
};

type Listing = {
  id: string;
  title: string;
  description?: string;
  city?: string;
  region?: string;
  status?: string;
  rejectionReason?: string | null;
  referenceNumber?: string;
  category?: ListingCategory;
  images?: ListingImage[];
  _count?: { auctions: number };
  [key: string]: unknown;
};

type Bid = {
  id: string;
  auctionId?: string;
  bidderId: string;
  amount: number | string;
  status: string;
  approvedAt?: string | null;
  createdAt: string;
  bidder?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  payment?: {
    id: string;
    amount: number | string;
    currency: string;
    method: string;
    status: string;
    transactionRef?: string | null;
    createdAt: string;
    verifiedAt?: string | null;
    rejectionReason?: string | null;
    receiptUrl?: string | null;
    bankReferenceUrl?: string | null;
  } | null;
};

type Auction = {
  id: string;
  status?: string;
  startingPrice?: number | string;
  currentHighestBid?: number | string;
  entryFeeStatus?: string;
  entryFees?: Array<{
    status: string;
    amount: number | string;
    currency: string;
  }>;
  bids?: Bid[];
  listing?: {
    title?: string;
    city?: string;
    category?: ListingCategory;
    images?: ListingImage[];
    [key: string]: unknown;
  };
  result?: {
    winningAmount?: number | string;
    depositDue?: number | string;
    isSettled?: boolean;
    [key: string]: unknown;
  };
  startAt?: string;
  endAt?: string;
  [key: string]: unknown;
};

type Category = {
  id: string;
  name: string;
  slug?: string;
  [key: string]: unknown;
};

type Notification = {
  id: string;
  type?: string;
  title: string;
  body: string;
  link?: string | null;
  createdAt: string;
  readAt?: string | null;
};

export function ProviderDashboardClient({
  user,
  isGoogleOnlyAccount,
  sellerProfile,
  listings,
  auctions,
  categories,
  notifications,
  initialTab,
}: {
  user: SellerUser;
  isGoogleOnlyAccount: boolean;
  sellerProfile: SellerProfile | null;
  listings: Listing[];
  auctions: Auction[];
  categories: Category[];
  notifications: Notification[];
  initialTab?: "notifications" | "account";
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "listings"
    | "create-listing"
    | "auctions"
    | "create-auction"
    | "bids"
    | "winners"
    | "payments"
    | "reports"
    | "kyc"
    | "notifications"
    | "account"
  >(initialTab ?? "dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };
  const [isPending, startTransition] = useTransition();
  const [listingDeleteMessage, setListingDeleteMessage] = useState<{
    error?: string;
    message?: string;
  } | null>(null);
  const [inquiryReplies, setInquiryReplies] = useState<Record<string, string>>({});
  const [replyingToInquiry, setReplyingToInquiry] = useState<string | null>(null);
  const [inquiryReplyFeedback, setInquiryReplyFeedback] = useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [selectedBid, setSelectedBid] = useState<
    (Bid & { auctionTitle: string; auctionStatus?: string; auctionEndAt?: string }) | null
  >(null);
  const handleReplyToInquiry = async (
    event: React.FormEvent<HTMLFormElement>,
    ticketId: string,
  ) => {
    event.preventDefault();
    setReplyingToInquiry(ticketId);
    setInquiryReplyFeedback((current) => {
      const next = { ...current };
      delete next[ticketId];
      return next;
    });

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set("ticketId", ticketId);
    try {
      const result = await replyToBuyerInquiryAction(formData);
      if ("error" in result) {
        setInquiryReplyFeedback((current) => ({
          ...current,
          [ticketId]: { success: false, message: result.error },
        }));
      } else {
        setInquiryReplyFeedback((current) => ({
          ...current,
          [ticketId]: {
            success: true,
            message: result.message ?? "Reply sent.",
          },
        }));
        setInquiryReplies((current) => ({ ...current, [ticketId]: "" }));
        formElement.reset();
      }
    } catch (error) {
      console.error("[Seller inquiry reply] Could not send reply:", error);
      setInquiryReplyFeedback((current) => ({
        ...current,
        [ticketId]: {
          success: false,
          message: "Could not send your reply. Please try again.",
        },
      }));
    } finally {
      setReplyingToInquiry(null);
    }
  };

  // Modals / forms
  const [showListingModal, setShowListingModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [selectedListingForAuction, setSelectedListingForAuction] = useState<Listing | null>(null);
  const [showEditListingModal, setShowEditListingModal] = useState(false);
  const [selectedListingForEdit, setSelectedListingForEdit] = useState<Listing | null>(null);
  const [editListingForm, setEditListingForm] = useState({
    title: "",
    description: "",
    city: "",
    region: "",
    address: "",
    features: [] as string[],
  });
  const [editListingMessage, setEditListingMessage] = useState<{
    error?: string;
    message?: string;
  } | null>(null);

  // Local state for listings to avoid full page refresh
  const [localListings, setLocalListings] = useState<Listing[]>(listings);

  // Payment and success dialogs
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogData, setSuccessDialogData] = useState<{
    title: string;
    message: string;
    nextStep?: string;
    icon?: "success" | "info" | "warning";
  } | null>(null);

  // Form messages
  const [kycMsg, setKycMsg] = useState<{ error?: string; success?: string } | null>(null);

  // KYC form state
  const [kycForm, setKycForm] = useState({
    nationalIdNumber: sellerProfile?.nationalIdNumber || "",
    businessName: sellerProfile?.businessName || "",
    taxId: sellerProfile?.taxId || "",
    address: sellerProfile?.address || "",
    idDocumentUrl: sellerProfile?.idDocumentUrl || "",
  });

  // Active category selection in listing creation
  const [selectedCatSlug, setSelectedCatSlug] = useState<string>("homes");

  // Summary Metrics
  const activeAuctions = auctions.filter((a) => a.status === "ACTIVE");
  const scheduledAuctions = auctions.filter((a) => a.status === "SCHEDULED");
  const completedAuctions = auctions.filter((a) => a.status === "COMPLETED");

  // All bids across seller's auctions
  const allBids: Array<Bid & { auctionTitle: string; auctionStatus?: string; auctionEndAt?: string }> = auctions
    .flatMap((a) =>
      (a.bids || []).map((b: Bid) => ({
        ...b,
        auctionTitle: a.listing?.title || "Auction Item",
        auctionStatus: a.status,
        auctionEndAt: a.endAt,
      }))
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  // Unique bidders
  const uniqueBidders = Array.from(new Set(allBids.map((b) => b.bidderId)));

  // Total sales volume
  const totalSales = completedAuctions.reduce(
    (sum, a) => sum + Number(a.result?.winningAmount || a.currentHighestBid || 0),
    0
  );

  const kycStatus = sellerProfile?.status || "NOT_SUBMITTED";

  return (
    <div className="flex min-h-screen bg-background text-slate-800 dark:text-slate-100 transition-colors">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ─────────────────── LEFT SIDEBAR ─────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#132238] bg-[#0A192F] text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-[#132644]">
          <ETHomeLogo dark size="md" href="/seller" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#12233f] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-4">
          <nav className="space-y-0.5 text-xs">
            <button
              onClick={() => selectTab("dashboard")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <LayoutDashboard size={16} />
              <span>Seller Overview</span>
            </button>

            <button
              onClick={() => selectTab("listings")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "listings"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3.5">
                <PackagePlus size={16} />
                <span>My Listings</span>
              </div>
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                {listings.length}
              </span>
            </button>

            <button
              onClick={() => selectTab("auctions")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "auctions"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3.5">
                <Gavel size={16} />
                <span>Manage Auctions</span>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                {auctions.length}
              </span>
            </button>

            <button
              onClick={() => selectTab("bids")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "bids"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3.5">
                <TrendingUp size={16} />
                <span>Monitor Bids</span>
              </div>
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                {allBids.length}
              </span>
            </button>

            <button
              onClick={() => selectTab("winners")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "winners"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <Award size={16} />
              <span>Winning Bidders</span>
            </button>

            <button
              onClick={() => selectTab("payments")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "payments"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <CreditCard size={16} />
              <span>Escrow & Settlements</span>
            </button>

            <button
              onClick={() => selectTab("kyc")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "kyc"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3.5">
                <ShieldCheck size={16} />
                <span>Seller Verification</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${kycStatus === "APPROVED"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
                  }`}
              >
                {kycStatus}
              </span>
            </button>

            <button
              onClick={() => selectTab("reports")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "reports"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <BarChart3 size={16} />
              <span>Reports & Analytics</span>
            </button>

            <button
              onClick={() => selectTab("account")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "account"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <UserRound size={16} />
              <span>Manage Account</span>
            </button>

            <button
              onClick={() => selectTab("notifications")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${activeTab === "notifications"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3.5">
                <Bell size={16} />
                <span>Notifications</span>
              </div>
              {notifications.filter((n) => !n.readAt).length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {notifications.filter((n) => !n.readAt).length}
                </span>
              )}
            </button>
          </nav>

          <div className="border-t border-[#132644] pt-4">
            <LogoutButton className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors" />
          </div>
        </div>
      </aside>

      {/* ─────────────────── MAIN VIEWPORT ─────────────────── */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0 w-full overflow-x-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0c1220]/95 px-4 sm:px-8 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {activeTab === "dashboard" && "Seller Control Center"}
              {activeTab === "listings" && "My Auction Items & Assets"}
              {activeTab === "auctions" && "Manage Scheduled & Live Auctions"}
              {activeTab === "bids" && "Real-Time Bid Monitor"}
              {activeTab === "winners" && "Winning Bidders & Conveyance"}
              {activeTab === "payments" && "Escrow Deposits & Payouts"}
              {activeTab === "kyc" && "Seller Identity Verification (KYC)"}
              {activeTab === "reports" && "Sales & Conversion Analytics"}
              {activeTab === "notifications" && "Seller Alerts"}
              {activeTab === "account" && "Manage Account"}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <button
              onClick={() => setShowListingModal(true)}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} /> Add Auction Item
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  {user.name}
                </div>
                <div className="text-xs text-slate-500">
                  Seller / Auction Owner
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 space-y-8">
          {/* KYC Alert if not approved */}
          {kycStatus !== "APPROVED" && (
            <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-5 text-xs text-amber-800">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-600" />
                <div>
                  <strong className="font-bold text-amber-900 block text-sm">
                    Seller Verification Required
                  </strong>
                  Submit your National ID / Business Registration documents to unlock live auction publishing.
                </div>
              </div>
              <button
                onClick={() => setActiveTab("kyc")}
                className="rounded-xl bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700 shadow-sm"
              >
                Complete KYC
              </button>
            </div>
          )}

          {/* ══════════════════ TAB 1: OVERVIEW ══════════════════ */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <PackagePlus size={20} />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">Total Items</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-500">My Listings</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{listings.length}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Gavel size={20} />
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Live Now</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-500">Active Auctions</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{activeAuctions.length}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <TrendingUp size={20} />
                    </div>
                    <span className="text-xs font-semibold text-purple-600">Bids Placed</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-500">Total Bids Received</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{allBids.length}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <DollarSign size={20} />
                    </div>
                    <span className="text-xs font-semibold text-amber-600">Settled</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-500">Gross Sales Volume</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {totalSales.toLocaleString()} ETB
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Auctions Live Board */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Live Active Auctions
                  </h3>
                  <button
                    onClick={() => setActiveTab("auctions")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Manage All &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {activeAuctions.map((auc) => (
                    <div
                      key={auc.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-100 p-4 hover:border-slate-200 bg-slate-50/50"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={auc.listing?.images?.[0]?.url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80"}
                          alt={auc.listing?.title}
                          className="h-16 w-24 rounded-lg object-cover"
                        />
                        <div>
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            LIVE
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">
                            {auc.listing?.title}
                          </h4>
                          <span className="text-xs text-slate-500">
                            {auc.listing?.city} • {auc.listing?.category?.name}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-400 block">Current High Bid</span>
                          <span className="text-base font-bold text-slate-900">
                            {Number(auc.currentHighestBid || auc.startingPrice).toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block">Bids Received</span>
                          <span className="font-semibold text-blue-600">
                            {auc.bids?.length || 0} bids
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Bids Feed */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Latest Bids on Your Items
                  </h3>
                  <button
                    onClick={() => setActiveTab("bids")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View All Bids &rarr;
                  </button>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {allBids.slice(0, 5).map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-[10px]">
                          ETB
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {b.auctionTitle}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            Bidder: {b.bidderId?.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 text-sm block">
                          {Number(b.amount).toLocaleString()} ETB
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {new Date(b.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 2: MY LISTINGS ══════════════════ */}
          {activeTab === "listings" && (
            <div className="space-y-6">
              {listingDeleteMessage && (
                <div
                  className={`rounded-xl border p-3 text-xs ${listingDeleteMessage.error
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                >
                  {listingDeleteMessage.error || listingDeleteMessage.message}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    My Listed Assets & Properties
                  </h2>
                  <p className="text-xs text-slate-500">
                    Approved items can be scheduled for live auction.
                  </p>
                </div>
                <button
                  onClick={() => setShowListingModal(true)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={16} /> Add New Listing
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {localListings.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-[16/10] bg-slate-100">
                        <img
                          src={l.images?.[0]?.url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80"}
                          alt={l.title}
                          className="h-full w-full object-cover"
                        />
                        <span className={`absolute top-3 left-3 rounded-md px-2 py-0.5 text-xs font-semibold ${TONE_CLASS[listingStatusMeta(l.status || "DRAFT").tone]}`}>  {listingStatusMeta(l.status || "DRAFT").label}</span>
                      </div>

                      <div className="p-5 space-y-2">
                        <span className="text-xs font-bold text-blue-600">
                          {l.category?.name}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                          {l.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {l.description}
                        </p>
                        {l.status === "REJECTED" && l.rejectionReason && (<p className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">Admin: {l.rejectionReason}</p>)}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin size={12} /> {l.city}, {l.region}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">
                        Ref: {l.referenceNumber || "ETH-LST"}
                      </span>
                      <div className="flex items-center gap-2">
                        {(l.status === "DRAFT" || l.status === "REJECTED" || l.status === "PENDING_REVIEW") && (
                          <button
                            onClick={() => {
                              setSelectedListingForEdit(l);
                              setEditListingForm({
                                title: l.title,
                                description: (l.description as string) || "",
                                city: (l.city as string) || "",
                                region: (l.region as string) || "",
                                address: (l.address as string) || "",
                                features: (l.features as string[]) || [],
                              });
                              setShowEditListingModal(true);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        {(l.status === "DRAFT" || l.status === "REJECTED") && (
                          <>
                            <button
                              disabled={isPending || (l._count?.auctions ?? 0) > 0}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Delete "${l.title}"? This cannot be undone.`,
                                  )
                                ) {
                                  return;
                                }
                                startTransition(async () => {
                                  const result = await deleteListingAction(l.id);
                                  setListingDeleteMessage(result);
                                  if (result.success) router.refresh();
                                });
                              }}
                              title={
                                (l._count?.auctions ?? 0) > 0
                                  ? "Listings with auction history cannot be deleted."
                                  : undefined
                              }
                              className="rounded-lg border border-rose-200 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => {
                                setSelectedListingForAuction(l);
                                setShowAuctionModal(true);
                              }}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                            >
                              Create Auction &rarr;
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 3: MANAGE AUCTIONS ══════════════════ */}
          {activeTab === "auctions" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Manage Auctions
                  </h2>
                  <p className="text-xs text-slate-500">
                    Schedule, monitor, and configure parameters for your auctions.
                  </p>
                </div>
                <button
                  onClick={() => setShowAuctionModal(true)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                >
                  Schedule New Auction
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Item Title</th>
                      <th className="pb-3 font-semibold">Starting Price</th>
                      <th className="pb-3 font-semibold">Current High Bid</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Entry Fee</th>
                      <th className="pb-3 font-semibold">Dates</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auctions.map((auc) => (
                      <tr key={auc.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">
                          {auc.listing?.title}
                        </td>
                        <td className="py-3 font-medium text-slate-700">
                          {Number(auc.startingPrice).toLocaleString()} ETB
                        </td>
                        <td className="py-3 font-bold text-blue-600">
                          {Number(auc.currentHighestBid || 0).toLocaleString()} ETB
                        </td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONE_CLASS[auctionStatusMeta(auc.status || "DRAFT").tone]}`}>  {auctionStatusMeta(auc.status || "DRAFT").label}</span>
                        </td>
                        <td className="py-3">
                          <span className="font-semibold">
                            {auc.entryFees?.[0]?.status ?? auc.entryFeeStatus ?? "UNPAID"}
                          </span>
                          {auc.entryFees?.[0] && (
                            <span className="block text-slate-500">
                              {Number(auc.entryFees[0].amount).toLocaleString()}{" "}
                              {auc.entryFees[0].currency}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-500">
                          {auc.startAt
                            ? new Date(auc.startAt).toLocaleDateString()
                            : "N/A"} - {" "}
                          {auc.endAt
                            ? new Date(auc.endAt).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="py-3 text-right">
                          {auc.status === "PENDING_APPROVAL" && auc.listing?.status === "APPROVED" && (auc.entryFees?.[0]?.status === "UNPAID" || auc.entryFees?.[0]?.status === "PENDING") && (
                            <button
                              onClick={() => {
                                setShowPaymentDialog(true);
                              }}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700 mr-2 transition shadow-lg shadow-emerald-500/30"
                            >
                              Pay Entry Fee
                            </button>
                          )}
                          {(auc.status === "PENDING_APPROVAL" || auc.status === "SCHEDULED") && auc.bids?.length === 0 && (
                            <button
                              onClick={() => {
                                startTransition(async () => {
                                  await cancelAuctionAction(auc.id);
                                });
                              }}
                              className="text-rose-600 hover:text-rose-700 font-semibold"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 4: MONITOR BIDS ══════════════════ */}
          {activeTab === "bids" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Real-Time Bids & Bidders Feed
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive audit of every bid submitted on your auctions.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Auction Item</th>
                      <th className="pb-3 font-semibold">Bidder ID</th>
                      <th className="pb-3 font-semibold">Bid Amount</th>
                      <th className="pb-3 font-semibold">Bid Status</th>
                      <th className="pb-3 font-semibold">Timestamp</th>
                      <th className="pb-3 text-right font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allBids.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">
                          {b.auctionTitle}
                        </td>
                        <td className="py-3 text-slate-700">
                          <span className="block font-semibold">{b.bidder?.name || "Unknown bidder"}</span>
                          <span className="block text-[11px] text-slate-500">{b.bidder?.email || b.bidderId}</span>
                        </td>
                        <td className="py-3 font-bold text-slate-900">
                          {Number(b.amount).toLocaleString()} ETB
                        </td>
                        <td className="py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(b.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedBid(b)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            <Eye size={13} /> View details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {allBids.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                          No bids have been placed on your auctions yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 5: WINNING BIDDERS ══════════════════ */}
          {activeTab === "winners" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Winning Bidders & Conveyance
                </h2>
                <p className="text-xs text-slate-500">
                  Concluded auctions awaiting settlement and title deed transfer.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {auctions
                  .filter((a) => a.status === "COMPLETED" || a.result)
                  .map((auc) => (
                    <div
                      key={auc.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          Concluded Winner
                        </span>
                        <span className="text-xs text-slate-400">
                          {auc.endAt ? new Date(auc.endAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">
                        {auc.listing?.title}
                      </h4>

                      <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Winning Amount:</span>
                          <span className="font-bold text-slate-900">
                            {Number(auc.result?.winningAmount || auc.currentHighestBid).toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Deposit Due:</span>
                          <span className="font-bold text-blue-600">
                            {Number(auc.result?.depositDue || 0).toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Escrow Status:</span>
                          <span className="font-bold text-emerald-600">
                            {auc.result?.isSettled ? "Settled & Verified" : "Pending Deposit"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 6: SELLER VERIFICATION (KYC) ══════════════════ */}
          {activeTab === "kyc" && (
            <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Seller Identity & Business Verification
                </h2>
                <p className="text-xs text-slate-500">
                  Submit government-issued identification and registered business details to verify your seller status.
                </p>
              </div>

              {kycMsg && (
                <div
                  className={`rounded-xl p-3 text-xs ${kycMsg.error
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                    }`}
                >
                  {kycMsg.error || kycMsg.success}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const res = await submitSellerKycAction(formData);
                    if (res.success) {
                      setKycMsg({ success: res.message });
                      setSuccessDialogData({
                        title: "KYC Submitted Successfully",
                        message: "Your identity verification has been submitted for review. An administrator will review your documents within 1-2 business days.",
                        nextStep: "Wait for admin approval",
                        icon: "success",
                      });
                      setShowSuccessDialog(true);
                    } else {
                      setKycMsg({ error: res.error });
                    }
                  });
                }}
                className="space-y-4 text-xs"
              >
                <AnimatedInput
                  label="National ID / Passport Number"
                  name="nationalIdNumber"
                  value={kycForm.nationalIdNumber}
                  onChange={(v) => setKycForm({ ...kycForm, nationalIdNumber: v })}
                  required
                  placeholder="e.g. ETH-NAT-890241"
                  minLength={4}
                  maxLength={50}
                  validate={(v) => {
                    if (!/^[A-Z0-9-]+$/.test(v)) {
                      return { valid: false, message: "Use uppercase letters, numbers, and hyphens only" };
                    }
                    return { valid: true };
                  }}
                />

                <AnimatedInput
                  label="Business / Entity Legal Name (Optional)"
                  name="businessName"
                  value={kycForm.businessName}
                  onChange={(v) => setKycForm({ ...kycForm, businessName: v })}
                  placeholder="e.g. Prime Estate Developers LLC"
                  maxLength={200}
                />

                <AnimatedInput
                  label="Tax Identification Number (TIN)"
                  name="taxId"
                  value={kycForm.taxId}
                  onChange={(v) => setKycForm({ ...kycForm, taxId: v })}
                  placeholder="e.g. TAX-987654321"
                  minLength={5}
                  maxLength={30}
                  validate={(v) => {
                    if (v && !/^[A-Z0-9-]+$/.test(v)) {
                      return { valid: false, message: "Use uppercase letters, numbers, and hyphens only" };
                    }
                    return { valid: true };
                  }}
                />

                <AnimatedInput
                  label="Physical Address"
                  name="address"
                  value={kycForm.address}
                  onChange={(v) => setKycForm({ ...kycForm, address: v })}
                  placeholder="Street, City, Region"
                  required
                  minLength={10}
                  maxLength={500}
                />

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ID Document / License URL or File Link
                  </label>
                  <input
                    name="idDocumentUrl"
                    defaultValue={sellerProfile?.idDocumentUrl || ""}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Submitting..." : "Submit KYC Documents"}
                </button>
              </form>
            </div>
          )}

          {/* ══════════════════ TAB 7: REPORTS ══════════════════ */}
          {activeTab === "reports" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Seller Sales & Auction Reports
                  </h2>
                  <p className="text-xs text-slate-500">
                    Historical metrics, auction clearance rate, and gross revenue summary.
                  </p>
                </div>
                <button
                  onClick={() => alert("Downloading CSV Report...")}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800"
                >
                  Export CSV Summary
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3 text-xs">
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">Total Auctions Hosted</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {auctions.length}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">Unique Participating Bidders</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {uniqueBidders.length}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">Settled Gross Volume</span>
                  <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                    {totalSales.toLocaleString()} ETB
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Notification Center
                </h2>
                <p className="text-xs text-slate-500">
                  Updates about your listings, auctions, payments, and account. Reply to buyer inquiries here.
                </p>
              </div>

              {notifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 text-slate-400" size={24} />
                  <p className="text-sm font-semibold text-slate-700">
                    You&apos;re all caught up
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    New updates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const inquiryTicketId = getInquiryTicketId(notification);
                    return (
                      <article
                        key={notification.id}
                        className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${notification.readAt
                          ? "border-slate-100 bg-slate-50"
                          : "border-blue-100 bg-blue-50/60"
                          }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${notification.readAt ? "bg-slate-400" : "bg-blue-600"
                              }`}
                          >
                            <Bell size={14} />
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900">
                              {notification.title}
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                              {notification.body}
                            </p>
                            <time
                              className="mt-2 block text-[10px] text-slate-400"
                              dateTime={notification.createdAt}
                            >
                              {new Date(notification.createdAt).toLocaleString()}
                            </time>
                            {notification.link && (
                              <a
                                href={notification.link}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                              >
                                View details <ExternalLink size={12} />
                              </a>
                            )}

                            {inquiryTicketId && (
                              <form
                                onSubmit={(event) =>
                                  handleReplyToInquiry(event, inquiryTicketId)
                                }
                                className="mt-4 max-w-xl rounded-xl border border-blue-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                              >
                                <label
                                  htmlFor={`inquiry-reply-${notification.id}`}
                                  className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                                >
                                  Reply to this buyer
                                </label>
                                <textarea
                                  id={`inquiry-reply-${notification.id}`}
                                  name="message"
                                  value={inquiryReplies[inquiryTicketId] ?? ""}
                                  onChange={(event) =>
                                    setInquiryReplies((current) => ({
                                      ...current,
                                      [inquiryTicketId]: event.target.value,
                                    }))
                                  }
                                  minLength={2}
                                  maxLength={2000}
                                  required
                                  rows={3}
                                  placeholder="Write a helpful reply to the buyer..."
                                  className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <span className="text-[10px] text-slate-500">
                                    2–2,000 characters
                                  </span>
                                  <button
                                    type="submit"
                                    disabled={replyingToInquiry === inquiryTicketId}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                                  >
                                    <Send size={13} />
                                    {replyingToInquiry === inquiryTicketId
                                      ? "Sending..."
                                      : "Send reply"}
                                  </button>
                                </div>
                                {inquiryReplyFeedback[inquiryTicketId] && (
                                  <p
                                    role="status"
                                    className={`mt-2 text-xs ${inquiryReplyFeedback[inquiryTicketId].success
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : "text-rose-700 dark:text-rose-400"
                                      }`}
                                  >
                                    {inquiryReplyFeedback[inquiryTicketId].message}
                                  </p>
                                )}
                              </form>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {!notification.readAt && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                startTransition(async () => {
                                  await markNotificationReadAction(notification.id);
                                })
                              }
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (!window.confirm("Delete this notification? This will not delete the inquiry or other users’ copies.")) return;
                              startTransition(async () => {
                                await deleteNotificationAction(notification.id);
                              });
                            }}
                            aria-label={`Delete notification: ${notification.title}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "account" && (
            <AccountManagement
              name={user.name}
              email={user.email}
              phone={user.phone}
              avatarUrl={user.avatarUrl}
              isGoogleOnly={isGoogleOnlyAccount}
            />
          )}
        </main>
      </div>

      {selectedBid && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedBid(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-bid-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Bid record</p>
                <h2 id="seller-bid-details-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {selectedBid.auctionTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBid(null)}
                aria-label="Close bid details"
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <dt className="text-xs text-slate-500">Bid amount</dt>
                <dd className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {Number(selectedBid.amount).toLocaleString()} ETB
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <dt className="text-xs text-slate-500">Bid status</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{selectedBid.status}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <dt className="text-xs text-slate-500">Submitted</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{new Date(selectedBid.createdAt).toLocaleString()}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <dt className="text-xs text-slate-500">Auction status / end</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {selectedBid.auctionStatus || "Unknown"}
                  {selectedBid.auctionEndAt ? ` · ${new Date(selectedBid.auctionEndAt).toLocaleString()}` : ""}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Bidder</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Name</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{selectedBid.bidder?.name || "Unavailable"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Email</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-slate-800 dark:text-slate-200">{selectedBid.bidder?.email || "Unavailable"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Account status</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{selectedBid.bidder?.status || "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Bidder ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-600 dark:text-slate-300">{selectedBid.bidderId}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Bid payment</h3>
              {selectedBid.payment ? (
                <>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-slate-500">Payment status</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedBid.payment.status}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Payment amount</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {Number(selectedBid.payment.amount).toLocaleString()} {selectedBid.payment.currency}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Method</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{selectedBid.payment.method}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Transaction reference</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">{selectedBid.payment.transactionRef || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Payment submitted</dt>
                      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">{new Date(selectedBid.payment.createdAt).toLocaleString()}</dd>
                    </div>
                    {selectedBid.payment.verifiedAt && (
                      <div>
                        <dt className="text-xs text-slate-500">Payment verified</dt>
                        <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">{new Date(selectedBid.payment.verifiedAt).toLocaleString()}</dd>
                      </div>
                    )}
                  </dl>
                  {selectedBid.payment.rejectionReason && (
                    <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                      Rejection reason: {selectedBid.payment.rejectionReason}
                    </p>
                  )}
                  {(selectedBid.payment.receiptUrl || selectedBid.payment.bankReferenceUrl) && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {selectedBid.payment.receiptUrl && (
                        <a href={selectedBid.payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-700 underline dark:text-blue-300">
                          Open receipt
                        </a>
                      )}
                      {selectedBid.payment.bankReferenceUrl && (
                        <a href={selectedBid.payment.bankReferenceUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-700 underline dark:text-blue-300">
                          Open payment evidence
                        </a>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No bid payment record has been submitted.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {(showListingModal || showAuctionModal) && (
        <ListingWizard
          categories={categories}
          listings={listings}
          startStep={showAuctionModal ? 2 : 1}
          initialListingId={selectedListingForAuction?.id ?? null}
          onClose={() => {
            setShowListingModal(false);
            setShowAuctionModal(false);
            setSelectedListingForAuction(null);
          }}
        />
      )}

      {/* Edit Listing Modal */}
      {showEditListingModal && selectedListingForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Listing</h3>
              <button
                onClick={() => {
                  setShowEditListingModal(false);
                  setSelectedListingForEdit(null);
                  setEditListingMessage(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editListingMessage && (
                <div
                  className={`rounded-lg p-3 text-sm ${editListingMessage.error
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                    }`}
                >
                  {editListingMessage.error || editListingMessage.message}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Title</label>
                <input
                  type="text"
                  value={editListingForm.title}
                  onChange={(e) => setEditListingForm({ ...editListingForm, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white"
                  placeholder="Enter listing title"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Description</label>
                <textarea
                  value={editListingForm.description}
                  onChange={(e) => setEditListingForm({ ...editListingForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white min-h-[120px]"
                  placeholder="Enter detailed description"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">City</label>
                  <input
                    type="text"
                    value={editListingForm.city}
                    onChange={(e) => setEditListingForm({ ...editListingForm, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Region</label>
                  <input
                    type="text"
                    value={editListingForm.region}
                    onChange={(e) => setEditListingForm({ ...editListingForm, region: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white"
                    placeholder="Region"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Address</label>
                <input
                  type="text"
                  value={editListingForm.address}
                  onChange={(e) => setEditListingForm({ ...editListingForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white"
                  placeholder="Full address"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Features (comma-separated)</label>
                <input
                  type="text"
                  value={editListingForm.features.join(", ")}
                  onChange={(e) =>
                    setEditListingForm({
                      ...editListingForm,
                      features: e.target.value.split(",").map((f) => f.trim()).filter(Boolean),
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white"
                  placeholder="e.g., Swimming pool, Garage, Garden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowEditListingModal(false);
                    setSelectedListingForEdit(null);
                    setEditListingMessage(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await updateListingAction(selectedListingForEdit.id, editListingForm);
                      setEditListingMessage(result);
                      if (result.success) {
                        // Update local state instead of full page refresh
                        setLocalListings(prevListings =>
                          prevListings.map(l =>
                            l.id === selectedListingForEdit.id
                              ? { ...l, ...editListingForm }
                              : l
                          )
                        );
                        setTimeout(() => {
                          setShowEditListingModal(false);
                          setSelectedListingForEdit(null);
                          setEditListingMessage(null);
                        }, 1500);
                      }
                    });
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Dialog */}
      {showPaymentDialog && (
        <PaymentMethodDialog
          isOpen={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          onMethodSelect={(method) => {
            // Handle payment method selection
            console.log("Selected payment method:", method);
            setSuccessDialogData({
              title: "Payment Initiated",
              message: `You selected ${method.toUpperCase()} payment. Please complete the payment process.`,
              nextStep: "Wait for payment confirmation",
              icon: "info",
            });
            setShowSuccessDialog(true);
          }}
          amount={5000}
          currency="ETB"
        />
      )}

      {/* Success Dialog */}
      {showSuccessDialog && successDialogData && (
        <WorkflowSuccessDialog
          isOpen={showSuccessDialog}
          onClose={() => setShowSuccessDialog(false)}
          title={successDialogData.title}
          message={successDialogData.message}
          nextStep={successDialogData.nextStep}
          icon={successDialogData.icon}
        />
      )}


    </div>
  );
}
