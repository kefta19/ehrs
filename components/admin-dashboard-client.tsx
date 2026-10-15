"use client";

import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  PackageCheck,
  Gavel,
  TrendingUp,
  CreditCard,
  MessageSquareWarning,
  BarChart3,
  Tags,
  Settings,
  History,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Check,
  Search,
  Sliders,
  DollarSign,
  Filter,
  Clock,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { ETHomeLogo } from "./ethome-brand";
import { LogoutButton } from "./logout-button";
import {
  verifySellerKycAction,
  reviewListingAction,
  updateAuctionStatusAction,
  verifyPaymentAction,
  updateTicketStatusAction,
  updateUserStatusAction,
  manageCategoryAction,
  updateSystemSettingsAction,
} from "@/app/actions/admin";
import {
  LISTING_REVIEW_CHECKS,
  type ListingReviewCheckKey,
} from "@/lib/listing-review";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

type AdminSellerProfile = {
  id: string;
  user: AdminUser;
  nationalIdNumber: string;
  businessName?: string | null;
  taxId?: string | null;
  status: string;
  address: string;
};

type AdminListing = {
  id: string;
  title: string;
  description: string;
  status: string;
  condition?: string | null;
  address?: string | null;
  region?: string | null;
  country?: string | null;
  features?: string[];
  attributes?: Record<string, unknown> | null;
  createdAt: string;
  rejectionReason?: string | null;
  category: { name: string };
  seller: AdminUser & {
    phone?: string | null;
    emailVerifiedAt?: string | null;
    sellerProfile: {
      status: string;
      nationalIdNumber: string;
      businessName?: string | null;
      taxId?: string | null;
      address?: string | null;
      idDocumentUrl?: string | null;
      reviewNote?: string | null;
      reviewedAt?: string | null;
    } | null;
  };
  referenceNumber?: string | null;
  city: string;
  images?: Array<{ id?: string; url?: string; displayOrder?: number }>;
  documents: Array<{
    id: string;
    title: string;
    documentType: string;
    fileUrl: string;
    isVerified: boolean;
  }>;
};

type AdminAuction = {
  id: string;
  listing: { title: string };
  seller: AdminUser;
  startingPrice: number | string;
  status: string;
};

type AdminBid = {
  id: string;
  auction?: { listing?: { title?: string } };
  bidder?: AdminUser;
  bidderId?: string;
  amount: number | string;
  createdAt: string;
  ipAddress?: string;
};

type AdminPayment = {
  id: string;
  transactionRef: string;
  payer?: AdminUser;
  amount: number | string;
  status: string;
};

type AdminTicket = {
  id: string;
  number: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  createdBy?: AdminUser;
  createdAt: string;
  resolution?: string;
};

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
};

type AdminAuditLog = {
  id: string;
  action: string;
  module: string;
  actorId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

type AdminSystemSetting = {
  id?: string;
  key?: string;
  value?: string | number | boolean | null;
};

export function AdminDashboardClient({
  user,
  stats,
  usersList,
  pendingKyc,
  pendingListings,
  allAuctions,
  allBids,
  payments,
  tickets,
  categories,
  systemSettings,
  auditLogs,
}: {
  user: AdminUser;
  stats: {
    totalUsers: number;
    pendingKycCount: number;
    activeAuctionsCount: number;
    totalVolume: number;
    openTicketsCount: number;
  };
  usersList: AdminUser[];
  pendingKyc: AdminSellerProfile[];
  pendingListings: AdminListing[];
  allAuctions: AdminAuction[];
  allBids: AdminBid[];
  payments: AdminPayment[];
  tickets: AdminTicket[];
  categories: AdminCategory[];
  systemSettings: AdminSystemSetting[];
  auditLogs: AdminAuditLog[];
}) {
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "users"
    | "kyc"
    | "listings"
    | "auctions"
    | "bids"
    | "payments"
    | "tickets"
    | "reports"
    | "categories"
    | "settings"
    | "audit"
  >("dashboard");

  const [isPending, startTransition] = useTransition();

  // Search in users
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");

  // KYC Review Modal
  const [reviewingKyc, setReviewingKyc] = useState<AdminSellerProfile | null>(null);
  const [kycNote, setKycNote] = useState("");

  // Listing Review Modal
  const [reviewingListing, setReviewingListing] = useState<AdminListing | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [listingChecks, setListingChecks] = useState<ListingReviewCheckKey[]>([]);
  const [listingFilter, setListingFilter] = useState<
    "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ALL"
  >("PENDING_REVIEW");

  // Payment Verification Modal
  const [verifyingPayment, setVerifyingPayment] = useState<AdminPayment | null>(null);
  const [paymentNote, setPaymentNote] = useState("");

  // Ticket Resolution Modal
  const [resolvingTicket, setResolvingTicket] = useState<AdminTicket | null>(null);
  const [ticketResolution, setTicketResolution] = useState("");

  // Category Add
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Global action notification
  const [actionMsg, setActionMsg] = useState<{ error?: string; message?: string; success?: boolean } | null>(null);

  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const pendingReviewListings = pendingListings.filter(
    (listing) => listing.status === "PENDING_REVIEW",
  );
  const listingCounts = {
    PENDING_REVIEW: pendingReviewListings.length,
    APPROVED: pendingListings.filter((listing) => listing.status === "APPROVED")
      .length,
    REJECTED: pendingListings.filter((listing) => listing.status === "REJECTED")
      .length,
    ALL: pendingListings.length,
  };
  const filteredListings =
    listingFilter === "ALL"
      ? pendingListings
      : pendingListings.filter((listing) => listing.status === listingFilter);

  const openListingReview = (listing: AdminListing) => {
    setReviewingListing(listing);
    setRejectionReason("");
    setListingChecks([]);
  };

  const ownerKycApproved =
    reviewingListing?.seller.sellerProfile?.status === "APPROVED";
  const missingApprovalRequirements = reviewingListing
    ? [
        ...(!ownerKycApproved
          ? ["The owner's seller KYC (national ID) must be approved."]
          : []),
        ...(reviewingListing.documents.length === 0
          ? ["Attach an ownership document."]
          : []),
        ...LISTING_REVIEW_CHECKS.filter(
          ({ key }) => !listingChecks.includes(key),
        ).map(({ label }) => `Complete: ${label}`),
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ─────────────────── LEFT SIDEBAR ─────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#132238] bg-[#0A192F] text-slate-300">
        <div className="flex h-16 items-center px-6 border-b border-[#132644]">
          <ETHomeLogo dark size="md" href="/admin" />
        </div>

        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-4">
          <nav className="space-y-0.5 text-xs">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Executive Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "users"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={16} />
                <span>Manage Users</span>
              </div>
              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] text-slate-300">
                {usersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("kyc")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "kyc"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} />
                <span>Verify Sellers</span>
              </div>
              {pendingKyc.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {pendingKyc.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("listings")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "listings"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <PackageCheck size={16} />
                <span>Approve Listings</span>
              </div>
              {pendingReviewListings.length > 0 && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  {pendingReviewListings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("auctions")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "auctions"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <Gavel size={16} />
              <span>Approve Auctions</span>
            </button>

            <button
              onClick={() => setActiveTab("bids")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "bids"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <TrendingUp size={16} />
              <span>Monitor Live Bids</span>
            </button>

            <button
              onClick={() => setActiveTab("payments")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "payments"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard size={16} />
                <span>Manage Payments</span>
              </div>
              {payments.filter((p) => p.status === "PENDING").length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {payments.filter((p) => p.status === "PENDING").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("tickets")}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "tickets"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquareWarning size={16} />
                <span>Complaints & Disputes</span>
              </div>
              {tickets.filter((t) => t.status === "OPEN").length > 0 && (
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                  {tickets.filter((t) => t.status === "OPEN").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("reports")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "reports"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <BarChart3 size={16} />
              <span>Reports & GMV</span>
            </button>

            <button
              onClick={() => setActiveTab("categories")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "categories"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <Tags size={16} />
              <span>Categories</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "settings"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <Settings size={16} />
              <span>System Settings</span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "audit"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <History size={16} />
              <span>Audit Logs</span>
            </button>
          </nav>

          <div className="border-t border-[#132644] pt-3">
            <LogoutButton className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors" />
          </div>
        </div>
      </aside>

      {/* ─────────────────── MAIN VIEWPORT ─────────────────── */}
      <div className="flex flex-1 flex-col pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
              Admin Portal
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {activeTab === "dashboard" && "Platform Operations & Intelligence"}
              {activeTab === "users" && "User Directory & Access Control"}
              {activeTab === "kyc" && "Seller Verification Queue"}
              {activeTab === "listings" && "Auction Listing Approvals"}
              {activeTab === "auctions" && "Auction Moderation"}
              {activeTab === "bids" && "Global Live Bidding Stream"}
              {activeTab === "payments" && "Escrow & Deposit Verifications"}
              {activeTab === "tickets" && "Disputes & Complaints Desk"}
              {activeTab === "reports" && "Platform Reports & Analytics"}
              {activeTab === "categories" && "Marketplace Categories"}
              {activeTab === "settings" && "Platform Governance & Parameters"}
              {activeTab === "audit" && "Immutable Audit Trail"}
            </h1>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-sm">
              AD
            </div>
            <div className="text-left text-xs">
              <div className="font-bold text-slate-900 leading-tight">
                {user.name}
              </div>
              <div className="text-slate-500">System Administrator</div>
            </div>
          </div>
        </header>

        {/* Action feedback alert */}
        {actionMsg && (
          <div className="mx-8 mt-6">
            <div
              className={`flex items-center justify-between rounded-xl p-4 text-xs ${
                actionMsg.error
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              <span>{actionMsg.error || actionMsg.message || "Action processed successfully."}</span>
              <button onClick={() => setActionMsg(null)}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-8 space-y-8">
          {/* ══════════════════ TAB 1: EXECUTIVE OVERVIEW ══════════════════ */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* 5 Stats Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-blue-600">
                    <Users size={20} />
                    <span className="text-[11px] text-slate-400">Total</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 font-medium">Registered Users</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalUsers}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-amber-600">
                    <ShieldCheck size={20} />
                    <span className="text-[11px] text-amber-600 font-semibold">Queue</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 font-medium">Pending KYC</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.pendingKycCount}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-emerald-600">
                    <Gavel size={20} />
                    <span className="text-[11px] text-emerald-600 font-semibold">Active</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 font-medium">Live Auctions</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.activeAuctionsCount}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-purple-600">
                    <DollarSign size={20} />
                    <span className="text-[11px] text-slate-400">GMV</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 font-medium">Platform Volume</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      $ {stats.totalVolume.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-rose-600">
                    <MessageSquareWarning size={20} />
                    <span className="text-[11px] text-rose-600 font-semibold">Action</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 font-medium">Open Disputes</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.openTicketsCount}</div>
                  </div>
                </div>
              </div>

              {/* Action Queues: KYC & Listing Approvals */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Pending KYC Reviews */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Seller Verification Queue ({pendingKyc.length})
                    </h3>
                    <button
                      onClick={() => setActiveTab("kyc")}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      View all &rarr;
                    </button>
                  </div>

                  {pendingKyc.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400">
                      All seller verification applications have been reviewed.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingKyc.slice(0, 3).map((k) => (
                        <div
                          key={k.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {k.user.name}
                            </span>
                            <span className="text-slate-400">
                              ID: {k.nationalIdNumber} • {k.businessName || "Individual"}
                            </span>
                          </div>
                          <button
                            onClick={() => setReviewingKyc(k)}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                          >
                            Review
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Listing Reviews */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Item Listings Queue ({pendingReviewListings.length})
                    </h3>
                    <button
                      onClick={() => setActiveTab("listings")}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      View all &rarr;
                    </button>
                  </div>

                  {pendingReviewListings.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400">
                      No pending item listings awaiting administrative approval.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingReviewListings.slice(0, 3).map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {l.title}
                            </span>
                            <span className="text-slate-400">
                              Seller: {l.seller.name} • {l.category.name}
                            </span>
                          </div>
                          <button
                            onClick={() => openListingReview(l)}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                          >
                            Inspect
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Bids Feed */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Recent Global Bidding Activity
                  </h3>
                  <button
                    onClick={() => setActiveTab("bids")}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Live monitor &rarr;
                  </button>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {allBids.slice(0, 5).map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3">
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {b.auction?.listing?.title || "Auction Item"}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Bidder: {b.bidder?.name || b.bidderId}
                        </span>
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

          {/* ══════════════════ TAB 2: MANAGE USERS ══════════════════ */}
          {activeTab === "users" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    User Directory & Roles
                  </h2>
                  <p className="text-xs text-slate-500">
                    Inspect user profiles, grant administrative privileges, or suspend delinquent accounts.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-blue-600"
                  />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-600"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="BUYER">Buyer / Customer</option>
                    <option value="SELLER">Seller / Owner</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">User</th>
                      <th className="pb-3 font-semibold">Email</th>
                      <th className="pb-3 font-semibold">Role</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Created</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">{u.name}</td>
                        <td className="py-3 text-slate-600">{u.email}</td>
                        <td className="py-3">
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right">
                          {u.id !== user.id && (
                            <button
                              onClick={() => {
                                const formData = new FormData();
                                formData.append("userId", u.id);
                                formData.append(
                                  "status",
                                  u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"
                                );
                                startTransition(async () => {
                                  const res = await updateUserStatusAction(formData);
                                  setActionMsg(res);
                                });
                              }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                              {u.status === "ACTIVE" ? "Suspend" : "Activate"}
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

          {/* ══════════════════ TAB 3: VERIFY SELLERS (KYC) ══════════════════ */}
          {activeTab === "kyc" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Seller Identity Verification Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Inspect National ID, Business registration, Tax Identification Numbers, and approve credentials.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Seller</th>
                      <th className="pb-3 font-semibold">National ID</th>
                      <th className="pb-3 font-semibold">Business Name</th>
                      <th className="pb-3 font-semibold">TIN</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingKyc.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">{k.user.name}</td>
                        <td className="py-3 font-mono">{k.nationalIdNumber}</td>
                        <td className="py-3 text-slate-600">{k.businessName || "N/A"}</td>
                        <td className="py-3 text-slate-600">{k.taxId || "N/A"}</td>
                        <td className="py-3">
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            {k.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setReviewingKyc(k)}
                            className="rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 4: APPROVE LISTINGS ══════════════════ */}
          {activeTab === "listings" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Approve Auction Items & Listings
                </h2>
                <p className="text-xs text-slate-500">
                  Inspect title deeds, vehicle ownership libre, building surveys, and approve for scheduled auctions.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["PENDING_REVIEW", "Pending review"],
                    ["APPROVED", "Approved"],
                    ["REJECTED", "Rejected"],
                    ["ALL", "All"],
                  ] as const
                ).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => setListingFilter(status)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      listingFilter === status
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label} ({listingCounts[status]})
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredListings.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[16/10] bg-slate-100">
                        <img
                          src={l.images?.[0]?.url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80"}
                          alt={l.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-4 space-y-2 text-xs">
                        <span className="font-bold text-blue-600">{l.category.name}</span>
                        <h4 className="font-bold text-slate-900 text-sm">{l.title}</h4>
                        <p className="text-slate-500 line-clamp-2">{l.description}</p>
                        <div className="text-slate-400">
                          Seller: <strong>{l.seller.name}</strong> • Ref: {l.referenceNumber || "Not provided"}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              l.seller.sellerProfile?.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700"
                                : l.seller.sellerProfile?.status === "REJECTED"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            Owner KYC: {l.seller.sellerProfile?.status || "NOT_SUBMITTED"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {l.documents.length} document{l.documents.length === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
                      <span
                        className={`rounded px-2 py-0.5 font-bold ${
                          l.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : l.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {l.status}
                      </span>
                      <button
                        onClick={() => openListingReview(l)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                      >
                        {l.status === "PENDING_REVIEW" ? "Inspect & Approve" : "View details"}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredListings.length === 0 && (
                  <p className="text-xs text-slate-400">
                    No listings in this status.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 5: APPROVE AUCTIONS ══════════════════ */}
          {activeTab === "auctions" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Auction Moderation & Approvals
                </h2>
                <p className="text-xs text-slate-500">
                  Approve scheduled auctions, monitor live sessions, or suspend auctions in dispute.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Auction Item</th>
                      <th className="pb-3 font-semibold">Seller</th>
                      <th className="pb-3 font-semibold">Starting Price</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allAuctions.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">{a.listing.title}</td>
                        <td className="py-3 text-slate-600">{a.seller.name}</td>
                        <td className="py-3 font-bold text-slate-900">
                          $ {Number(a.startingPrice).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          {a.status !== "ACTIVE" && (
                            <button
                              onClick={() => {
                                const formData = new FormData();
                                formData.append("auctionId", a.id);
                                formData.append("status", "ACTIVE");
                                startTransition(async () => {
                                  const res = await updateAuctionStatusAction(formData);
                                  setActionMsg(res);
                                });
                              }}
                              className="text-emerald-600 font-semibold hover:underline"
                            >
                              Launch Active
                            </button>
                          )}
                          {a.status === "ACTIVE" && (
                            <button
                              onClick={() => {
                                const formData = new FormData();
                                formData.append("auctionId", a.id);
                                formData.append("status", "SUSPENDED");
                                startTransition(async () => {
                                  const res = await updateAuctionStatusAction(formData);
                                  setActionMsg(res);
                                });
                              }}
                              className="text-amber-600 font-semibold hover:underline"
                            >
                              Suspend
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

          {/* ══════════════════ TAB 6: MONITOR LIVE BIDS ══════════════════ */}
          {activeTab === "bids" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Global Live Bidding Stream
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time tamper-evident stream of all bids placed on the platform.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Auction Item</th>
                      <th className="pb-3 font-semibold">Bidder</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">IP Address</th>
                      <th className="pb-3 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allBids.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">
                          {b.auction?.listing?.title}
                        </td>
                        <td className="py-3 text-slate-600">{b.bidder?.name}</td>
                        <td className="py-3 font-bold text-blue-600">
                          $ {Number(b.amount).toLocaleString()}
                        </td>
                        <td className="py-3 font-mono text-slate-400">{b.ipAddress || "127.0.0.1"}</td>
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

          {/* ══════════════════ TAB 7: MANAGE PAYMENTS ══════════════════ */}
          {activeTab === "payments" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Escrow Deposit & Settlement Verification
                </h2>
                <p className="text-xs text-slate-500">
                  Verify bank wire receipts, approve escrow funds, and mark conveyances as settled.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Reference</th>
                      <th className="pb-3 font-semibold">Payer</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono font-semibold text-slate-900">
                          {p.transactionRef}
                        </td>
                        <td className="py-3 text-slate-600">{p.payer?.name}</td>
                        <td className="py-3 font-bold text-slate-900">
                          $ {Number(p.amount).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {p.status !== "PAID" ? (
                            <button
                              onClick={() => setVerifyingPayment(p)}
                              className="rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700"
                            >
                              Verify Deposit
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-semibold">Verified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 8: COMPLAINTS & TICKETS ══════════════════ */}
          {activeTab === "tickets" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Disputes, Complaints & Support Tickets
                </h2>
                <p className="text-xs text-slate-500">
                  Resolve user complaints regarding property discrepancies, misrepresentation, or escrow delays.
                </p>
              </div>

              <div className="space-y-4">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-slate-200 p-5 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-blue-600">{t.number}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {t.type}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{t.subject}</h4>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-bold ${
                          t.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <p className="text-slate-600">{t.description}</p>
                    <div className="text-slate-400">
                      Filed by: <strong>{t.createdBy?.name}</strong> • {new Date(t.createdAt).toLocaleString()}
                    </div>

                    {t.resolution && (
                      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800">
                        <strong>Resolution:</strong> {t.resolution}
                      </div>
                    )}

                    {t.status !== "RESOLVED" && (
                      <button
                        onClick={() => setResolvingTicket(t)}
                        className="rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700"
                      >
                        Resolve Dispute
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 9: REPORTS ══════════════════ */}
          {activeTab === "reports" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Platform Analytics & Financial Reports
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gross merchandise value, clearance rates, commission earnings, and growth.
                  </p>
                </div>
                <button
                  onClick={() => alert("Downloading Platform Audit & Financial Report...")}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800"
                >
                  Export Financial Report
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">Total Auctions Hosted</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {allAuctions.length}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">Total Bids Processed</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {allBids.length}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">Platform Gross GMV</span>
                  <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                    $ {stats.totalVolume.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">Estimated Commission (2.5%)</span>
                  <span className="text-2xl font-bold text-blue-600 mt-1 block">
                    $ {(stats.totalVolume * 0.025).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 10: CATEGORIES ══════════════════ */}
          {activeTab === "categories" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Marketplace Categories
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage asset types, icons, and dynamic attributes.
                  </p>
                </div>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                >
                  Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4 bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.icon || "📦"}</span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                        <span className="text-slate-400 text-xs font-mono">{c.slug}</span>
                      </div>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 11: SYSTEM SETTINGS ══════════════════ */}
          {activeTab === "settings" && (
            <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Platform Governance & Auction Parameters
                </h2>
                <p className="text-xs text-slate-500">
                  Configure global anti-sniping soft close windows, earnest deposit rates, and escrow rules.
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const res = await updateSystemSettingsAction(formData);
                    setActionMsg(res);
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    System Platform Name
                  </label>
                  <input
                    name="systemName"
                    defaultValue="ETHome - Online Auction Marketplace"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Currency Code
                    </label>
                    <input
                      name="currency"
                      defaultValue="USD"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Soft-Close Anti-Sniping Window (Minutes)
                    </label>
                    <input
                      name="softCloseMinutes"
                      type="number"
                      defaultValue="5"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Earnest Money Deposit (%)
                    </label>
                    <input
                      name="depositPercent"
                      type="number"
                      defaultValue="10"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Platform Seller Commission (%)
                    </label>
                    <input
                      name="commissionPercent"
                      type="number"
                      step="0.1"
                      defaultValue="2.5"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Governance Settings
                </button>
              </form>
            </div>
          )}

          {/* ══════════════════ TAB 12: AUDIT LOGS ══════════════════ */}
          {activeTab === "audit" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Immutable Platform Audit Trail
                </h2>
                <p className="text-xs text-slate-500">
                  Cryptographically traceable log of administrative actions, bid submissions, and status mutations.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Action</th>
                      <th className="pb-3 font-semibold">Module</th>
                      <th className="pb-3 font-semibold">Actor ID</th>
                      <th className="pb-3 font-semibold">IP Address</th>
                      <th className="pb-3 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono font-bold text-slate-900">{a.action}</td>
                        <td className="py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {a.module}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-slate-500">{a.actorId || "SYSTEM"}</td>
                        <td className="py-3 font-mono text-slate-400">{a.ipAddress || "127.0.0.1"}</td>
                        <td className="py-3 text-slate-400">
                          {new Date(a.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─────────────────── MODAL: REVIEW KYC ─────────────────── */}
      {reviewingKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-blue-600">Review Seller Verification</span>
              <button onClick={() => setReviewingKyc(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block">Seller Name</span>
                <strong className="text-sm text-slate-900">{reviewingKyc.user.name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">National ID Number</span>
                <span className="font-mono text-slate-800">{reviewingKyc.nationalIdNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Business Name</span>
                <span>{reviewingKyc.businessName || "Individual Owner"}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Address</span>
                <span>{reviewingKyc.address}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Review Feedback Note
              </label>
              <textarea
                value={kycNote}
                onChange={(e) => setKycNote(e.target.value)}
                placeholder="Optional feedback..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-3 pt-2 text-xs">
              <button
                onClick={() => {
                  const formData = new FormData();
                  formData.append("sellerProfileId", reviewingKyc.id);
                  formData.append("status", "REJECTED");
                  formData.append("reviewNote", kycNote);
                  startTransition(async () => {
                    const res = await verifySellerKycAction(formData);
                    setActionMsg(res);
                    setReviewingKyc(null);
                  });
                }}
                className="flex-1 rounded-xl border border-rose-200 py-2.5 font-bold text-rose-600 hover:bg-rose-50"
              >
                Reject KYC
              </button>
              <button
                onClick={() => {
                  const formData = new FormData();
                  formData.append("sellerProfileId", reviewingKyc.id);
                  formData.append("status", "APPROVED");
                  formData.append("reviewNote", kycNote);
                  startTransition(async () => {
                    const res = await verifySellerKycAction(formData);
                    setActionMsg(res);
                    setReviewingKyc(null);
                  });
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700"
              >
                Approve Seller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: REVIEW LISTING ─────────────────── */}
      {reviewingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl space-y-6 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3">
              <div>
                <span className="font-bold text-blue-600">Listing Review</span>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {reviewingListing.title}
                </h2>
              </div>
              <button
                onClick={() => setReviewingListing(null)}
                aria-label="Close listing review"
              >
                <X size={18} />
              </button>
            </div>

            <section className="space-y-3">
              <h3 className="font-bold text-slate-900">1. Property details</h3>
              <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
                <div>
                  <span className="block text-slate-400">Category</span>
                  <strong>{reviewingListing.category.name}</strong>
                </div>
                <div>
                  <span className="block text-slate-400">Status</span>
                  <strong>{reviewingListing.status}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-slate-400">Description</span>
                  <p className="whitespace-pre-wrap text-slate-700">
                    {reviewingListing.description}
                  </p>
                </div>
                <div>
                  <span className="block text-slate-400">Condition</span>
                  <strong>{reviewingListing.condition || "Not specified"}</strong>
                </div>
                <div>
                  <span className="block text-slate-400">Reference number</span>
                  <strong>
                    {reviewingListing.referenceNumber || "Not provided"}
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-slate-400">Address / location</span>
                  <strong>
                    {[
                      reviewingListing.address,
                      reviewingListing.city,
                      reviewingListing.region,
                      reviewingListing.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Not provided"}
                  </strong>
                </div>
                <div>
                  <span className="block text-slate-400">Created</span>
                  <strong>
                    {new Date(reviewingListing.createdAt).toLocaleString()}
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-slate-400">Features</span>
                  {reviewingListing.features?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {reviewingListing.features.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500">None listed</span>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <span className="block text-slate-400">
                    Additional attributes
                  </span>
                  {Object.entries(reviewingListing.attributes || {}).length >
                  0 ? (
                    <dl className="mt-1 divide-y divide-slate-200">
                      {Object.entries(reviewingListing.attributes || {}).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between gap-4 py-1.5"
                          >
                            <dt className="font-medium text-slate-600">{key}</dt>
                            <dd className="text-right text-slate-800">
                              {typeof value === "string"
                                ? value
                                : JSON.stringify(value) ?? String(value)}
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                  ) : (
                    <span className="text-slate-500">None listed</span>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-bold text-slate-900">2. Photos</h3>
              {reviewingListing.images?.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {reviewingListing.images.map((image, index) => (
                    <img
                      key={image.id || image.url || index}
                      src={image.url}
                      alt={`${reviewingListing.title} photo ${index + 1}`}
                      className="aspect-[4/3] w-full rounded-xl bg-slate-100 object-cover"
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                  No photos uploaded.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="font-bold text-slate-900">
                3. Ownership documents
              </h3>
              {reviewingListing.documents.length > 0 ? (
                <div className="space-y-2">
                  {reviewingListing.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs"
                    >
                      <div>
                        <strong className="block text-slate-900">
                          {document.title}
                        </strong>
                        <span className="text-slate-500">
                          {document.documentType.replace(/_/g, " ")}
                        </span>{" "}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            document.isVerified
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {document.isVerified ? "Verified" : "Not verified"}
                        </span>
                      </div>
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                      >
                        Open document <ExternalLink size={13} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  No ownership document is attached to this listing.
                </p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="font-bold text-slate-900">4. Owner (seller)</h3>
              <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
                <div>
                  <span className="block text-slate-400">Name</span>
                  <strong>{reviewingListing.seller.name}</strong>
                </div>
                <div>
                  <span className="block text-slate-400">Email</span>
                  <strong>{reviewingListing.seller.email}</strong>
                </div>
                <div>
                  <span className="block text-slate-400">Phone</span>
                  <strong>{reviewingListing.seller.phone || "Not provided"}</strong>
                </div>
                <div>
                  <span className="block text-slate-400">Account status</span>
                  <strong>{reviewingListing.seller.status}</strong>
                </div>
                <div>
                  <span className="block text-slate-400">Email verified</span>
                  <strong>
                    {reviewingListing.seller.emailVerifiedAt ? "Yes" : "No"}
                  </strong>
                </div>

                <div className="sm:col-span-2">
                  <h4 className="mb-2 font-bold text-slate-800">Seller KYC</h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <span className="block text-slate-400">KYC status</span>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 font-bold ${
                          reviewingListing.seller.sellerProfile?.status ===
                          "APPROVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : reviewingListing.seller.sellerProfile?.status ===
                                "REJECTED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {reviewingListing.seller.sellerProfile?.status ||
                          "NOT_SUBMITTED"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">
                        National ID number
                      </span>
                      <strong>
                        {reviewingListing.seller.sellerProfile?.nationalIdNumber ||
                          "Not provided"}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Business name</span>
                      <strong>
                        {reviewingListing.seller.sellerProfile?.businessName ||
                          "Not provided"}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Tax ID</span>
                      <strong>
                        {reviewingListing.seller.sellerProfile?.taxId ||
                          "Not provided"}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">KYC address</span>
                      <strong>
                        {reviewingListing.seller.sellerProfile?.address ||
                          "Not provided"}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-400">Reviewed at</span>
                      <strong>
                        {reviewingListing.seller.sellerProfile?.reviewedAt
                          ? new Date(
                              reviewingListing.seller.sellerProfile.reviewedAt,
                            ).toLocaleString()
                          : "Not reviewed"}
                      </strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="block text-slate-400">Review note</span>
                      <p className="text-slate-700">
                        {reviewingListing.seller.sellerProfile?.reviewNote ||
                          "No review note"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="block text-slate-400">ID document</span>
                      {reviewingListing.seller.sellerProfile?.idDocumentUrl ? (
                        /\.(png|jpe?g|webp|gif)(\?|$)/i.test(
                          reviewingListing.seller.sellerProfile.idDocumentUrl,
                        ) ||
                        reviewingListing.seller.sellerProfile.idDocumentUrl.includes(
                          "images.unsplash.com",
                        ) ? (
                          <img
                            src={
                              reviewingListing.seller.sellerProfile.idDocumentUrl
                            }
                            alt={`${reviewingListing.seller.name} ID document`}
                            className="mt-2 max-h-64 max-w-full rounded-xl border border-slate-200 object-contain"
                          />
                        ) : (
                          <a
                            href={
                              reviewingListing.seller.sellerProfile.idDocumentUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                          >
                            Open ID document <ExternalLink size={13} />
                          </a>
                        )
                      ) : (
                        <p className="text-slate-500">Not uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {!ownerKycApproved && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <span>
                    Seller KYC must be approved before this listing can be
                    approved.
                  </span>
                  <button
                    onClick={() => {
                      setReviewingListing(null);
                      setActiveTab("kyc");
                    }}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700"
                  >
                    Review seller KYC
                  </button>
                </div>
              )}
            </section>

            {reviewingListing.status === "PENDING_REVIEW" ? (
              <>
                <section className="space-y-3">
                  <h3 className="font-bold text-slate-900">
                    5. Verification checklist
                  </h3>
                  <div className="space-y-2">
                    {LISTING_REVIEW_CHECKS.map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={listingChecks.includes(key)}
                          onChange={(event) =>
                            setListingChecks((current) =>
                              event.target.checked
                                ? [...current, key]
                                : current.filter((check) => check !== key),
                            )
                          }
                          className="mt-0.5 accent-blue-600"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-3 border-t border-slate-100 pt-5">
                  <h3 className="font-bold text-slate-900">6. Actions</h3>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Rejection reason
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      rows={2}
                      placeholder="Explain what needs to be corrected..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => {
                        const formData = new FormData();
                        formData.append("listingId", reviewingListing.id);
                        formData.append("status", "REJECTED");
                        formData.append(
                          "rejectionReason",
                          rejectionReason.trim(),
                        );
                        startTransition(async () => {
                          const res = await reviewListingAction(formData);
                          setActionMsg(res);
                          setReviewingListing(null);
                        });
                      }}
                      disabled={!rejectionReason.trim() || isPending}
                      className="rounded-xl border border-rose-200 py-2.5 font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject listing
                    </button>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          const formData = new FormData();
                          formData.append("listingId", reviewingListing.id);
                          formData.append("status", "APPROVED");
                          listingChecks.forEach((key) =>
                            formData.append("checks", key),
                          );
                          startTransition(async () => {
                            const res = await reviewListingAction(formData);
                            setActionMsg(res);
                            setReviewingListing(null);
                          });
                        }}
                        disabled={
                          !ownerKycApproved ||
                          reviewingListing.documents.length === 0 ||
                          LISTING_REVIEW_CHECKS.some(
                            ({ key }) => !listingChecks.includes(key),
                          ) ||
                          isPending
                        }
                        className="w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Approve listing
                      </button>
                      {missingApprovalRequirements.length > 0 && (
                        <ul className="space-y-1 text-[11px] text-rose-600">
                          {missingApprovalRequirements.map((requirement) => (
                            <li key={requirement}>• {requirement}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <h3 className="font-bold text-slate-900">
                  Listing review status: {reviewingListing.status}
                </h3>
                {reviewingListing.rejectionReason && (
                  <p className="text-rose-700">
                    <strong>Rejection reason:</strong>{" "}
                    {reviewingListing.rejectionReason}
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: VERIFY PAYMENT ─────────────────── */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-blue-600">Verify Escrow Payment</span>
              <button onClick={() => setVerifyingPayment(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block">Payer</span>
                <strong>{verifyingPayment.payer?.name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Reference No.</span>
                <span className="font-mono text-sm font-bold">{verifyingPayment.transactionRef}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Deposit Amount</span>
                <span className="text-sm font-bold text-emerald-600">
                  $ {Number(verifyingPayment.amount).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Verification Notes
              </label>
              <input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Confirmed into bank escrow..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-3 pt-2 text-xs">
              <button
                onClick={() => {
                  const formData = new FormData();
                  formData.append("paymentId", verifyingPayment.id);
                  formData.append("status", "FAILED");
                  formData.append("notes", paymentNote);
                  startTransition(async () => {
                    const res = await verifyPaymentAction(formData);
                    setActionMsg(res);
                    setVerifyingPayment(null);
                  });
                }}
                className="flex-1 rounded-xl border border-rose-200 py-2.5 font-bold text-rose-600 hover:bg-rose-50"
              >
                Mark Failed
              </button>
              <button
                onClick={() => {
                  const formData = new FormData();
                  formData.append("paymentId", verifyingPayment.id);
                  formData.append("status", "PAID");
                  formData.append("notes", paymentNote);
                  startTransition(async () => {
                    const res = await verifyPaymentAction(formData);
                    setActionMsg(res);
                    setVerifyingPayment(null);
                  });
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700"
              >
                Confirm Escrow (PAID)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: RESOLVE TICKET ─────────────────── */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-blue-600">Resolve Dispute Ticket</span>
              <button onClick={() => setResolvingTicket(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-mono font-bold text-blue-600">{resolvingTicket.number}</span>
              <h4 className="font-bold text-slate-900">{resolvingTicket.subject}</h4>
              <p className="text-slate-600">{resolvingTicket.description}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resolution Statement
              </label>
              <textarea
                value={ticketResolution}
                onChange={(e) => setTicketResolution(e.target.value)}
                rows={3}
                placeholder="State the resolution and actions taken..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-3 pt-2 text-xs">
              <button
                onClick={() => setResolvingTicket(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const formData = new FormData();
                  formData.append("ticketId", resolvingTicket.id);
                  formData.append("status", "RESOLVED");
                  formData.append("resolution", ticketResolution);
                  startTransition(async () => {
                    const res = await updateTicketStatusAction(formData);
                    setActionMsg(res);
                    setResolvingTicket(null);
                  });
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700"
              >
                Submit Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: ADD CATEGORY ─────────────────── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-blue-600">Add Category</span>
              <button onClick={() => setShowCategoryModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await manageCategoryAction(formData);
                  setActionMsg(res);
                  setShowCategoryModal(false);
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Category Slug *
                </label>
                <input
                  name="slug"
                  placeholder="e.g. aviation-vessels"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Display Name *
                </label>
                <input
                  name="name"
                  placeholder="e.g. Aviation & Vessels"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Emoji Icon
                </label>
                <input
                  name="icon"
                  placeholder="e.g. ✈️"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  name="description"
                  placeholder="Asset description..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
