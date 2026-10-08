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
import {
  submitSellerKycAction,
  createListingAction,
  createAuctionAction,
  cancelAuctionAction,
} from "@/app/actions/seller";

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

  // Form messages
  const [kycMsg, setKycMsg] = useState<{ error?: string; success?: string } | null>(null);
  const [listingMsg, setListingMsg] = useState<{ error?: string; success?: string } | null>(null);
  const [auctionMsg, setAuctionMsg] = useState<{ error?: string; success?: string } | null>(null);

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
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-[#080d1a] text-slate-800 dark:text-slate-100 transition-colors">
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
                        <span className="absolute top-3 left-3 rounded-md bg-slate-900/80 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                          {l.status}
                        </span>
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
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin size={12} /> {l.city}, {l.region}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">
                        Ref: {l.referenceNumber || "ETH-LST"}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedListingForAuction(l);
                          setShowAuctionModal(true);
                        }}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                      >
                        Create Auction &rarr;
                      </button>
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
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              auc.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : auc.status === "SCHEDULED"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {auc.status}
                          </span>
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
                          {auc.status === "SCHEDULED" && auc.bids?.length === 0 && (
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
                    if (res.success) setKycMsg({ success: res.message });
                    else setKycMsg({ error: res.error });
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    National ID / Passport Number *
                  </label>
                  <input
                    name="nationalIdNumber"
                    defaultValue={sellerProfile?.nationalIdNumber || ""}
                    required
                    placeholder="e.g. ETH-NAT-890241"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Business / Entity Legal Name (Optional)
                  </label>
                  <input
                    name="businessName"
                    defaultValue={sellerProfile?.businessName || ""}
                    placeholder="e.g. Prime Estate Developers LLC"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tax Identification Number (TIN)
                  </label>
                  <input
                    name="taxId"
                    defaultValue={sellerProfile?.taxId || ""}
                    placeholder="e.g. TIN-00984128"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Physical Operating Address *
                  </label>
                  <input
                    name="address"
                    defaultValue={sellerProfile?.address || ""}
                    required
                    placeholder="e.g. Kazanchis Financial District, Addis Ababa"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>

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

      {/* ─────────────────── MODAL: ADD AUCTION ITEM ─────────────────── */}
      {showListingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-blue-600">
                <PackagePlus size={20} />
                <span>Add New Auction Item (Listing)</span>
              </div>
              <button
                onClick={() => setShowListingModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {listingMsg && (
              <div
                className={`rounded-xl p-3 text-xs ${
                  listingMsg.error
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {listingMsg.error || listingMsg.success}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await createListingAction(formData);
                  if (res.success) {
                    setListingMsg({ success: res.message });
                    setTimeout(() => {
                      setShowListingModal(false);
                      setListingMsg(null);
                    }, 1800);
                  } else {
                    setListingMsg({ error: res.error });
                  }
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  name="categoryId"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Listing Title *
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Modern Family House, Toyota Land Cruiser..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    name="city"
                    required
                    placeholder="e.g. Addis Ababa"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Region / Subcity
                  </label>
                  <input
                    name="region"
                    placeholder="e.g. Bole"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Physical Address
                </label>
                <input
                  name="address"
                  placeholder="Street / Plot details"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference / Parcel / VIN Number
                </label>
                <input
                  name="referenceNumber"
                  placeholder="e.g. ETH-HOM-2026-001"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  name="description"
                  rows={3}
                  required
                  placeholder="Describe the asset, dimensions, legal conditions, construction..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Key Features / Specifications (Comma separated)
                </label>
                <input
                  name="features"
                  placeholder="3 Beds, 2 Baths, 250 m², Backup Generator, Garden"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Image URLs (One per line)
                </label>
                <textarea
                  name="imageUrls"
                  rows={2}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ownership Document Link (Title Deed / Libre)
                </label>
                <input
                  name="docUrl"
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowListingModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Save Auction Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: SCHEDULE AUCTION ─────────────────── */}
      {showAuctionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-blue-600">
                <Gavel size={20} />
                <span>Create & Schedule Auction</span>
              </div>
              <button
                onClick={() => setShowAuctionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {auctionMsg && (
              <div
                className={`rounded-xl p-3 text-xs ${
                  auctionMsg.error
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {auctionMsg.error || auctionMsg.success}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await createAuctionAction(formData);
                  if (res.success) {
                    setAuctionMsg({ success: res.message });
                    setTimeout(() => {
                      setShowAuctionModal(false);
                      setAuctionMsg(null);
                    }, 1800);
                  } else {
                    setAuctionMsg({ error: res.error });
                  }
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Item to Auction *
                </label>
                <select
                  name="listingId"
                  defaultValue={selectedListingForAuction?.id}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                >
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Starting Price ($ USD) *
                  </label>
                  <input
                    type="number"
                    name="startingPrice"
                    required
                    placeholder="e.g. 50000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Min Bid Increment ($ USD) *
                  </label>
                  <input
                    type="number"
                    name="minBidIncrement"
                    required
                    placeholder="e.g. 1000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confidential Reserve Price ($ USD, Optional)
                </label>
                <input
                  type="number"
                  name="reservePrice"
                  placeholder="Minimum price you agree to sell for"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="startAt"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Closing Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="endAt"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Auction Closing Terms & Earnest Money Deposit Rules
                </label>
                <textarea
                  name="terms"
                  rows={2}
                  placeholder="e.g. 10% earnest money deposit required within 72 hours of auction closing..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuctionModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Scheduling..." : "Launch Auction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
