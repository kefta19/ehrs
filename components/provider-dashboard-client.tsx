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
  DollarSign,
  Plus,
  FileText,
  Upload,
  Calendar,
  Eye,
  Check,
  Menu,
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
} from "@/app/actions/seller";
import { ListingWizard } from "./listing-wizard";
import { auctionStatusMeta, listingStatusMeta, TONE_CLASS } from "@/lib/status-labels";

type SellerUser = {
  name: string;
  email?: string;
  [key: string]: unknown;
};

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
  [key: string]: unknown;
};

type Bid = {
  id?: string;
  bidderId?: string;
  amount?: number | string;
  createdAt: string;
  [key: string]: unknown;
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
  id?: string;
  readAt?: string | null;
  [key: string]: unknown;
};

export function ProviderDashboardClient({
  user,
  sellerProfile,
  listings,
  auctions,
  categories,
  notifications,
}: {
  user: SellerUser;
  sellerProfile: SellerProfile | null;
  listings: Listing[];
  auctions: Auction[];
  categories: Category[];
  notifications: Notification[];
}) {
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
  >("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };
  const [isPending, startTransition] = useTransition();

  // Modals / forms
  const [showListingModal, setShowListingModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [selectedListingForAuction, setSelectedListingForAuction] = useState<Listing | null>(null);

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
  const allBids: Array<Bid & { auctionTitle: string }> = auctions
    .flatMap((a) =>
      (a.bids || []).map((b: Bid) => ({
        ...b,
        auctionTitle: a.listing?.title || "Auction Item",
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#132238] bg-[#0A192F] text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
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

        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-6">
          <nav className="space-y-1">
            <button
              onClick={() => selectTab("dashboard")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Seller Overview</span>
            </button>

            <button
              onClick={() => selectTab("listings")}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "listings"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <PackagePlus size={18} />
                <span>My Listings</span>
              </div>
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                {listings.length}
              </span>
            </button>

            <button
              onClick={() => selectTab("auctions")}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "auctions"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Gavel size={18} />
                <span>Manage Auctions</span>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                {auctions.length}
              </span>
            </button>

            <button
              onClick={() => selectTab("bids")}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "bids"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <TrendingUp size={18} />
                <span>Monitor Bids</span>
              </div>
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                {allBids.length}
              </span>
            </button>

            <button
              onClick={() => selectTab("winners")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "winners"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <Award size={18} />
              <span>Winning Bidders</span>
            </button>

            <button
              onClick={() => selectTab("payments")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "payments"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <CreditCard size={18} />
              <span>Escrow & Settlements</span>
            </button>

            <button
              onClick={() => selectTab("kyc")}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "kyc"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <ShieldCheck size={18} />
                <span>Seller Verification</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  kycStatus === "APPROVED"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {kycStatus}
              </span>
            </button>

            <button
              onClick={() => selectTab("reports")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "reports"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <BarChart3 size={18} />
              <span>Reports & Analytics</span>
            </button>

            <button
              onClick={() => selectTab("notifications")}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "notifications"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Bell size={18} />
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
            <LogoutButton className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors" />
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
                      $ {totalSales.toLocaleString()}
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
                            $ {Number(auc.currentHighestBid || auc.startingPrice).toLocaleString()}
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                          $
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
                          $ {Number(b.amount).toLocaleString()}
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
                {listings.map((l) => (
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
                        {l.status === "REJECTED" && l.rejectionReason && (  <p className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">Admin: {l.rejectionReason}</p>)}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin size={12} /> {l.city}, {l.region}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">
                        Ref: {l.referenceNumber || "ETH-LST"}
                      </span>
                      {(l.status === "DRAFT" || l.status === "REJECTED") && (
                        <button
                          onClick={() => {
                            setSelectedListingForAuction(l);
                            setShowAuctionModal(true);
                          }}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                        >
                          Create Auction &rarr;
                        </button>
                      )}
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
                          $ {Number(auc.startingPrice).toLocaleString()}
                        </td>
                        <td className="py-3 font-bold text-blue-600">
                          $ {Number(auc.currentHighestBid || 0).toLocaleString()}
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
                      <th className="pb-3 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allBids.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">
                          {b.auctionTitle}
                        </td>
                        <td className="py-3 font-mono text-slate-600">
                          {b.bidderId}
                        </td>
                        <td className="py-3 font-bold text-slate-900">
                          $ {Number(b.amount).toLocaleString()}
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(b.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
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
                            $ {Number(auc.result?.winningAmount || auc.currentHighestBid).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Deposit Due:</span>
                          <span className="font-bold text-blue-600">
                            $ {Number(auc.result?.depositDue || 0).toLocaleString()}
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
                  className={`rounded-xl p-3 text-xs ${
                    kycMsg.error
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
                    $ {totalSales.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

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
