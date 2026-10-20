"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Menu,
  Eye,
  Check,
  Search,
  Sliders,
  DollarSign,
  Filter,
  Clock,
  MapPin,
  ExternalLink,
  Palette,
  User,
  FileText,
  Fingerprint,
  Phone,
  Mail,
  Building2,
  Video,
  Bell,
  Trash2,
} from "lucide-react";
import { ETHomeLogo } from "./ethome-brand";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
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
import { adminConfirmBuyerRegistrationAction } from "@/app/actions/bid-registration";
import { deleteNotificationAction } from "@/app/actions/buyer";
import { AccountManagement } from "@/components/account-management";
import { deleteListingAction } from "@/app/actions/listing";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  status: string;
  createdAt: string;
  sellerProfile?: {
    nationalIdNumber?: string;
    businessName?: string | null;
    taxId?: string | null;
    address?: string;
    idDocumentUrl?: string | null;
    status?: string;
  } | null;
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
  condition?: string;
  category: { id?: string; name: string };
  seller: AdminUser;
  referenceNumber?: string | null;
  city: string;
  region?: string | null;
  address?: string | null;
  features?: string[];
  attributes?: Record<string, any> | null;
  videoUrl?: string | null;
  ownerNationalId?: string | null;
  idDocumentMediaId?: string | null;
  biometricVerificationId?: string | null;
  biometricVerification?: {
    method?: string;
    createdAt?: string;
    credentialId?: string;
  } | null;
  images?: Array<{ id?: string; url: string; isPrimary?: boolean }>;
  documents?: Array<{
    id: string;
    title: string;
    documentType: string;
    fileUrl: string;
    isVerified?: boolean;
  }>;
  entryFeeStatus?: string;
  entryFees?: Array<{
    id: string;
    status: string;
    amount: number | string;
    currency: string;
    method?: string | null;
    ratePercent?: number | string;
    txRef?: string | null;
    bankReference?: string | null;
    transactionUrl?: string | null;
    paymentProofMediaId?: string | null;
    createdAt?: string;
  }>;
  auctions?: Array<{
    id: string;
    status: string;
    startingPrice: number | string;
    reservePrice?: number | string | null;
    minBidIncrement: number | string;
    startAt: string;
    endAt: string;
    terms?: string | null;
    entryFees?: Array<{
      id: string;
      status: string;
      amount: number | string;
      currency: string;
      ratePercent?: number | string | null;
      method?: string | null;
      txRef?: string | null;
      bankReference?: string | null;
      transactionUrl?: string | null;
      paymentProofMediaId?: string | null;
    }>;
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
  auction?: {
    id: string;
    status: string;
    startAt: string;
    endAt: string;
    listing?: { title?: string };
  };
  bidder?: AdminUser;
  bidderId?: string;
  amount: number | string;
  createdAt: string;
  ipAddress?: string;
  status: string;
  approvedAt?: string | null;
  payment?: {
    id: string;
    amount: number | string;
    currency: string;
    method: string;
    status: string;
    transactionRef?: string | null;
    receiptUrl?: string | null;
    bankReferenceUrl?: string | null;
    rejectionReason?: string | null;
    createdAt: string;
    verifiedAt?: string | null;
  } | null;
};

type AdminPayment = {
  id: string;
  transactionRef: string | null;
  payer?: AdminUser;
  amount: number | string;
  status: string;
  currency?: string;
  method?: string;
  receiptUrl?: string | null;
  notes?: string | null;
  createdAt?: string;
  paidAt?: string | null;
  auctionResult?: {
    id: string;
    auction: {
      id: string;
      listing: {
        title: string;
      };
    };
  } | null;
};

type AdminBuyerRegistration = {
  id: string;
  feeAmount: number | string;
  currency: string;
  paymentMethod?: string | null;
  paymentProofUrl?: string | null;
  txRef?: string | null;
  createdAt: string;
  buyer: { id: string; name: string; email: string };
  auction: { id: string; listing: { title: string } };
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

type AdminNotification = {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

type AdminSystemSetting = {
  id?: string;
  key?: string;
  value?: string | number | boolean | null;
};

export function AdminDashboardClient({
  user,
  isGoogleOnlyAccount,
  initialTab,
  stats,
  usersList,
  pendingKyc,
  pendingListings,
  allAuctions,
  allBids,
  pendingBuyerRegistrations,
  payments,
  tickets,
  categories,
  systemSettings,
  auditLogs,
  notifications,
}: {
  user: AdminUser;
  isGoogleOnlyAccount: boolean;
  initialTab?: string;
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
  pendingBuyerRegistrations: AdminBuyerRegistration[];
  payments: AdminPayment[];
  tickets: AdminTicket[];
  categories: AdminCategory[];
  systemSettings: AdminSystemSetting[];
  auditLogs: AdminAuditLog[];
  notifications: AdminNotification[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => {
    const validTabs = [
      "dashboard",
      "users",
      "kyc",
      "listings",
      "auctions",
      "bids",
      "payments",
      "tickets",
      "reports",
      "categories",
      "settings",
      "audit",
      "notifications",
      "account",
    ] as const;
    if (initialTab && (validTabs as readonly string[]).includes(initialTab)) {
      return initialTab as (typeof validTabs)[number];
    }
    return "dashboard";
  });

  const [isPending, startTransition] = useTransition();
  const [selectedBid, setSelectedBid] = useState<AdminBid | null>(null);

  // Search in users
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");

  // KYC Review Modal
  const [reviewingKyc, setReviewingKyc] = useState<AdminSellerProfile | null>(
    null,
  );
  const [kycNote, setKycNote] = useState("");

  // Listing Review Modal
  const [reviewingListing, setReviewingListing] = useState<AdminListing | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");

  // Payment Verification Modal
  const [verifyingPayment, setVerifyingPayment] = useState<AdminPayment | null>(
    null,
  );
  const [paymentNote, setPaymentNote] = useState("");

  // Ticket Resolution Modal
  const [resolvingTicket, setResolvingTicket] = useState<AdminTicket | null>(
    null,
  );
  const [ticketResolution, setTicketResolution] = useState("");

  // Category Add
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Global action notification
  const [actionMsg, setActionMsg] = useState<{
    error?: string;
    message?: string;
    success?: boolean;
  } | null>(null);
  const [buyerRegistrationNotes, setBuyerRegistrationNotes] = useState<Record<string, string>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

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
          <ETHomeLogo dark size="md" href="/admin" />
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
              onClick={() => selectTab("users")}
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
              onClick={() => selectTab("kyc")}
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
              onClick={() => selectTab("listings")}
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
              {pendingListings.length > 0 && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  {pendingListings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => selectTab("auctions")}
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
              onClick={() => selectTab("bids")}
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
              onClick={() => selectTab("payments")}
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
              {payments.filter((p) => p.status === "PENDING").length + pendingBuyerRegistrations.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {payments.filter((p) => p.status === "PENDING").length + pendingBuyerRegistrations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => selectTab("tickets")}
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
              onClick={() => selectTab("reports")}
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
              onClick={() => selectTab("categories")}
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
              onClick={() => selectTab("settings")}
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
              onClick={() => selectTab("audit")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "audit"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <History size={16} />
              <span>Audit Logs</span>
            </button>
            <button
              onClick={() => selectTab("notifications")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "notifications"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <Bell size={16} />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => selectTab("account")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                activeTab === "account"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <User size={16} />
              <span>Manage Account</span>
            </button>
          </nav>

          <Link
            href="/dashboard/settings/branding"
            onClick={() => setMobileMenuOpen(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white"
          >
            <Palette size={16} />
            <span>Branding</span>
          </Link>

          <div className="border-t border-[#132644] pt-3">
            <LogoutButton className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors" />
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
              aria-label="Open sidebar navigation"
            >
              <Menu size={20} />
            </button>
            <span className="hidden sm:inline-block rounded-md bg-blue-100 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
              Admin Portal
            </span>
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {activeTab === "dashboard" &&
                "Platform Operations & Intelligence"}
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
              {activeTab === "notifications" && "Notification Center"}
              {activeTab === "account" && "Manage Account"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-sm">
                AD
              </div>
              <div className="text-left text-xs">
                <div className="font-bold text-slate-900 dark:text-white leading-tight">
                  {user.name}
                </div>
                <div className="text-slate-500 dark:text-slate-400">System Administrator</div>
              </div>
            </div>
          </div>
        </header>

        {/* Action feedback alert */}
        {actionMsg && (
          <div className="mx-4 sm:mx-8 mt-6">
            <div
              className={`flex items-center justify-between rounded-xl p-4 text-xs ${
                actionMsg.error
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              <span>
                {actionMsg.error ||
                  actionMsg.message ||
                  "Action processed successfully."}
              </span>
              <button onClick={() => setActionMsg(null)}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 space-y-8">
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
                    <div className="text-xs text-slate-500 font-medium">
                      Registered Users
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.totalUsers}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-amber-600">
                    <ShieldCheck size={20} />
                    <span className="text-[11px] text-amber-600 font-semibold">
                      Queue
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 font-medium">
                      Pending KYC
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.pendingKycCount}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-emerald-600">
                    <Gavel size={20} />
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Active
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 font-medium">
                      Live Auctions
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.activeAuctionsCount}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-purple-600">
                    <DollarSign size={20} />
                    <span className="text-[11px] text-slate-400">GMV</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 font-medium">
                      Platform Volume
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.totalVolume.toLocaleString()} ETB
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-rose-600">
                    <MessageSquareWarning size={20} />
                    <span className="text-[11px] text-rose-600 font-semibold">
                      Action
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-slate-500 font-medium">
                      Open Disputes
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {stats.openTicketsCount}
                    </div>
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
                              ID: {k.nationalIdNumber} •{" "}
                              {k.businessName || "Individual"}
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
                      Item Listings Queue ({pendingListings.length})
                    </h3>
                    <button
                      onClick={() => setActiveTab("listings")}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      View all &rarr;
                    </button>
                  </div>

                  {pendingListings.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400">
                      No pending item listings awaiting administrative approval.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingListings.slice(0, 3).map((l) => (
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
                            onClick={() => setReviewingListing(l)}
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
                    <div
                      key={idx}
                      className="flex items-center justify-between py-3"
                    >
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

          {/* ══════════════════ TAB 2: MANAGE USERS ══════════════════ */}
          {activeTab === "users" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    User Directory & Roles
                  </h2>
                  <p className="text-xs text-slate-500">
                    Inspect user profiles, grant administrative privileges, or
                    suspend delinquent accounts.
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
                        <td className="py-3 font-semibold text-slate-900">
                          {u.name}
                        </td>
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
                                  u.status === "ACTIVE"
                                    ? "SUSPENDED"
                                    : "ACTIVE",
                                );
                                startTransition(async () => {
                                  const res =
                                    await updateUserStatusAction(formData);
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
                  Inspect National ID, Business registration, Tax Identification
                  Numbers, and approve credentials.
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
                        <td className="py-3 font-semibold text-slate-900">
                          {k.user.name}
                        </td>
                        <td className="py-3 font-mono">{k.nationalIdNumber}</td>
                        <td className="py-3 text-slate-600">
                          {k.businessName || "N/A"}
                        </td>
                        <td className="py-3 text-slate-600">
                          {k.taxId || "N/A"}
                        </td>
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
                  Inspect title deeds, vehicle ownership libre, building
                  surveys, and approve for scheduled auctions.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pendingListings.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[16/10] bg-slate-100">
                        <img
                          src={
                            l.images?.[0]?.url ||
                            "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80"
                          }
                          alt={l.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-4 space-y-2 text-xs">
                        <span className="font-bold text-blue-600">
                          {l.category.name}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {l.title}
                        </h4>
                        <p className="text-slate-500 line-clamp-2">
                          {l.description}
                        </p>
                        <div className="text-slate-400">
                          Seller: <strong>{l.seller.name}</strong> • Ref:{" "}
                          {l.referenceNumber}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
                      <span className="rounded bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                        {l.status}
                      </span>
                      <div className="flex items-center gap-2">
                        {(l.auctions?.length ?? 0) === 0 &&
                          (l.entryFees?.length ?? 0) === 0 && (
                            <button
                              disabled={isPending}
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
                                  setActionMsg(result);
                                  if (result.success) router.refresh();
                                });
                              }}
                              className="rounded-lg border border-rose-200 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          )}
                        <button
                          onClick={() => setReviewingListing(l)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                        >
                          Inspect & Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                  Approve scheduled auctions, monitor live sessions, or suspend
                  auctions in dispute.
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
                      <th className="pb-3 font-semibold text-right">
                        Moderation Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allAuctions.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">
                          {a.listing.title}
                        </td>
                        <td className="py-3 text-slate-600">{a.seller.name}</td>
                        <td className="py-3 font-bold text-slate-900">
                          {Number(a.startingPrice).toLocaleString()} ETB
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
                                  const res =
                                    await updateAuctionStatusAction(formData);
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
                                  const res =
                                    await updateAuctionStatusAction(formData);
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
                  Real-time tamper-evident stream of all bids placed on the
                  platform.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Auction Item</th>
                      <th className="pb-3 font-semibold">Bidder</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Bid Status</th>
                      <th className="pb-3 font-semibold">IP Address</th>
                      <th className="pb-3 font-semibold">Timestamp</th>
                      <th className="pb-3 text-right font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allBids.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-900">
                          {b.auction?.listing?.title}
                        </td>
                        <td className="py-3 text-slate-600">
                          {b.bidder?.name}
                        </td>
                        <td className="py-3 font-bold text-blue-600">
                          {Number(b.amount).toLocaleString()} ETB
                        </td>
                        <td className="py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-slate-400">
                          {b.ipAddress || "127.0.0.1"}
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
                        <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                          No bids have been submitted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 7: MANAGE PAYMENTS ══════════════════ */}
          {activeTab === "payments" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Buyer Entrance Fee Reviews
                  </h2>
                  <p className="text-xs text-slate-500">
                    Check the buyer&apos;s transaction reference and receipt before granting bid access.
                  </p>
                </div>
                {pendingBuyerRegistrations.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No buyer entrance fee payments are waiting for review.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingBuyerRegistrations.map((registration) => (
                      <div
                        key={registration.id}
                        className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-slate-900">
                            {registration.buyer.name} · {registration.auction.listing.title}
                          </p>
                          <p className="text-slate-600">{registration.buyer.email}</p>
                          <p className="text-slate-600">
                            {registration.currency} {Number(registration.feeAmount).toLocaleString()} · {registration.paymentMethod || "Payment method unavailable"}
                          </p>
                          <p className="font-mono text-xs text-slate-500">
                            Reference: {registration.txRef || "—"} · Submitted {new Date(registration.createdAt).toLocaleString()}
                          </p>
                          {registration.paymentProofUrl ? (
                            <a
                              href={registration.paymentProofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 underline"
                            >
                              Open payment receipt <ExternalLink size={13} />
                            </a>
                          ) : (
                            <p className="font-semibold text-rose-600">No payment receipt link was submitted.</p>
                          )}
                          <input
                            value={buyerRegistrationNotes[registration.id] || ""}
                            maxLength={500}
                            onChange={(event) => {
                              setBuyerRegistrationNotes((previous) => ({
                                ...previous,
                                [registration.id]: event.target.value,
                              }));
                            }}
                            placeholder="Optional note if rejecting"
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          />
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                const result = await adminConfirmBuyerRegistrationAction(
                                  registration.id,
                                  "REJECTED",
                                  buyerRegistrationNotes[registration.id] || "",
                                );
                                setActionMsg(result);
                                if (result.success) router.refresh();
                              });
                            }}
                            className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            disabled={isPending || !registration.paymentProofUrl}
                            onClick={() => {
                              startTransition(async () => {
                                const result = await adminConfirmBuyerRegistrationAction(registration.id, "PAID");
                                setActionMsg(result);
                                if (result.success) router.refresh();
                              });
                            }}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve & enable bidding
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Escrow Deposit & Settlement Verification
                </h2>
                <p className="text-xs text-slate-500">
                  Verify bank wire receipts, approve escrow funds, and mark
                  conveyances as settled.
                </p>
              </div>

              {payments.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No escrow deposit payments recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="pb-3 font-semibold">Reference</th>
                        <th className="pb-3 font-semibold">Property / Auction</th>
                        <th className="pb-3 font-semibold">Payer</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Proof / Slip</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">
                          Verification
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 font-mono font-semibold text-slate-900">
                            <div>{p.transactionRef ?? "—"}</div>
                            {p.createdAt && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-slate-700 max-w-xs truncate font-medium">
                            {p.auctionResult?.auction.listing.title || "Auction Settlement"}
                          </td>
                          <td className="py-3 text-slate-600">
                            <div className="font-medium text-slate-900">{p.payer?.name ?? "—"}</div>
                            <div className="text-[10px] text-slate-400">{p.payer?.email}</div>
                          </td>
                          <td className="py-3 font-bold text-slate-900">
                            {Number(p.amount).toLocaleString()} {p.currency || "ETB"}
                          </td>
                          <td className="py-3">
                            {p.receiptUrl ? (
                              <a
                                href={p.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 underline"
                              >
                                View slip <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                p.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : p.status === "FAILED"
                                  ? "bg-rose-50 text-rose-700"
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
                                className="rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700 shadow-sm"
                              >
                                Verify Deposit
                              </button>
                            ) : (
                              <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                                ✓ Verified
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                  Resolve user complaints regarding property discrepancies,
                  misrepresentation, or escrow delays.
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
                        <span className="font-mono font-bold text-blue-600">
                          {t.number}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {t.type}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {t.subject}
                        </h4>
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
                      Filed by: <strong>{t.createdBy?.name}</strong> •{" "}
                      {new Date(t.createdAt).toLocaleString()}
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
                    Gross merchandise value, clearance rates, commission
                    earnings, and growth.
                  </p>
                </div>
                <button
                  onClick={() =>
                    alert("Downloading Platform Audit & Financial Report...")
                  }
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800"
                >
                  Export Financial Report
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">
                    Total Auctions Hosted
                  </span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {allAuctions.length}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">
                    Total Bids Processed
                  </span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {allBids.length}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">
                    Platform Gross GMV
                  </span>
                  <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                    {stats.totalVolume.toLocaleString()} ETB
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-slate-400 block">
                    Estimated Commission (2.5%)
                  </span>
                  <span className="text-2xl font-bold text-blue-600 mt-1 block">
                    {(stats.totalVolume * 0.025).toLocaleString()} ETB
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
                        <h4 className="font-bold text-slate-900 text-sm">
                          {c.name}
                        </h4>
                        <span className="text-slate-400 text-xs font-mono">
                          {c.slug}
                        </span>
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
                  Configure global anti-sniping soft close windows, earnest
                  deposit rates, and escrow rules.
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Currency Code
                    </label>
                    <input
                      name="currency"
                      defaultValue="ETB"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {activeTab === "notifications" && (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Admin notifications
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Delete a notification from your account. This does not delete its related inquiry or other users&apos; notifications.
                </p>
              </div>
              {notifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                  <Bell className="mx-auto mb-2 text-slate-400" size={24} />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    You&apos;re all caught up
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    New updates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
                        notification.readAt
                          ? "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                          : "border-blue-100 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30"
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Bell size={14} />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {notification.title}
                          </h3>
                          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {notification.body}
                          </p>
                          <time
                            className="mt-2 block text-[10px] text-slate-400"
                            dateTime={notification.createdAt}
                          >
                            {new Date(notification.createdAt).toLocaleString()}
                          </time>
                          {notification.link && (
                            <Link
                              href={notification.link}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300"
                            >
                              View details <ExternalLink size={12} />
                            </Link>
                          )}
                        </div>
                      </div>
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
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </article>
                  ))}
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

          {/* ══════════════════ TAB 12: AUDIT LOGS ══════════════════ */}
          {activeTab === "audit" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Immutable Platform Audit Trail
                </h2>
                <p className="text-xs text-slate-500">
                  Cryptographically traceable log of administrative actions, bid
                  submissions, and status mutations.
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
                        <td className="py-3 font-mono font-bold text-slate-900">
                          {a.action}
                        </td>
                        <td className="py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {a.module}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-slate-500">
                          {a.actorId || "SYSTEM"}
                        </td>
                        <td className="py-3 font-mono text-slate-400">
                          {a.ipAddress || "127.0.0.1"}
                        </td>
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
              <span className="font-bold text-blue-600">
                Review Seller Verification
              </span>
              <button onClick={() => setReviewingKyc(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block">Seller Name</span>
                <strong className="text-sm text-slate-900">
                  {reviewingKyc.user.name}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">National ID Number</span>
                <span className="font-mono text-slate-800">
                  {reviewingKyc.nationalIdNumber}
                </span>
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

      {/* ─────────────────── MODAL: FULL INSPECTION & LIVE APPROVAL ─────────────────── */}
      {reviewingListing && (() => {
        const auc = reviewingListing.auctions?.[0];
        const fee = reviewingListing.entryFees?.[0] || auc?.entryFees?.[0];
        const profile = reviewingListing.seller.sellerProfile;
        const nationalId =
          reviewingListing.ownerNationalId || profile?.nationalIdNumber;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-6 animate-in fade-in text-xs">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-full bg-blue-100 px-3 py-0.5 font-bold text-blue-700 text-[11px]">
                      {reviewingListing.category.name}
                    </span>
                    <span className="rounded-full bg-amber-100 px-3 py-0.5 font-bold text-amber-800 text-[11px]">
                      STATUS: {reviewingListing.status}
                    </span>
                    {reviewingListing.referenceNumber && (
                      <span className="text-slate-400 font-mono">
                        Ref: {reviewingListing.referenceNumber}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {reviewingListing.title}
                  </h3>
                  <p className="text-slate-500">
                    {reviewingListing.city}
                    {reviewingListing.region ? `, ${reviewingListing.region}` : ""}
                    {reviewingListing.address ? ` • ${reviewingListing.address}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setReviewingListing(null)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 2-Column Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Owner & Document Identity */}
                <div className="space-y-4">
                  {/* Owner Info Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-slate-800 font-bold text-sm">
                      <User size={16} className="text-blue-600" />
                      <h4>Owner & Seller Information</h4>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Full Name</span>
                        <strong className="text-slate-900">
                          {reviewingListing.seller.name}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email</span>
                        <span className="font-mono text-slate-700">
                          {reviewingListing.seller.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phone</span>
                        <span className="font-medium text-slate-800">
                          {reviewingListing.seller.phone || "Not specified"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Business / Trade Name</span>
                        <span className="text-slate-800">
                          {profile?.businessName || "Individual Owner"}
                        </span>
                      </div>
                      {profile?.taxId && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tax ID (TIN)</span>
                          <span className="font-mono text-slate-700">
                            {profile.taxId}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Registered Address</span>
                        <span className="text-slate-700 text-right max-w-[200px] truncate">
                          {profile?.address || reviewingListing.address || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Seller KYC Status</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            profile?.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {profile?.status || "PENDING"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documents & Verification Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-slate-800 font-bold text-sm">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <h4>Identity & Legal Documentation</h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">National ID Number</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {nationalId || "Not recorded"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">National ID Document</span>
                        {reviewingListing.idDocumentMediaId ? (
                          <a
                            href={`/api/media/${reviewingListing.idDocumentMediaId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 font-bold text-blue-600 hover:underline bg-white px-2.5 py-1 rounded-lg border border-blue-200"
                          >
                            <FileText size={13} /> View ID Document
                          </a>
                        ) : profile?.idDocumentUrl ? (
                          <a
                            href={profile.idDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 font-bold text-blue-600 hover:underline bg-white px-2.5 py-1 rounded-lg border border-blue-200"
                          >
                            <FileText size={13} /> View KYC Document
                          </a>
                        ) : (
                          <span className="text-rose-500 font-semibold">
                            Not uploaded
                          </span>
                        )}
                      </div>

                      {/* Title Deed / Ownership Documents */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-200">
                        <span className="text-slate-500 font-semibold block">
                          Legal Deeds & Ownership Certificates
                        </span>
                        {reviewingListing.documents &&
                        reviewingListing.documents.length > 0 ? (
                          <div className="space-y-1">
                            {reviewingListing.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200"
                              >
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {doc.title}
                                  </p>
                                  <p className="text-[10px] text-slate-400 uppercase">
                                    {doc.documentType}
                                  </p>
                                </div>
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                                >
                                  <ExternalLink size={12} /> Open File
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-rose-600 text-[11px]">
                            No ownership documents attached.
                          </p>
                        )}
                      </div>

                      {/* Biometric Verification */}
                      <div className="pt-1 border-t border-slate-200">
                        {reviewingListing.biometricVerification ? (
                          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-emerald-800 border border-emerald-200">
                            <Fingerprint size={18} className="text-emerald-600" />
                            <div>
                              <p className="font-bold">
                                Passkey Fingerprint Signed on Device
                              </p>
                              <p className="text-[10px] text-emerald-600">
                                Method:{" "}
                                {reviewingListing.biometricVerification.method ||
                                  "WebAuthn"}{" "}
                                ·{" "}
                                {new Date(
                                  reviewingListing.biometricVerification.createdAt!,
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-amber-800 border border-amber-200">
                            <ShieldCheck size={18} className="text-amber-600" />
                            <p className="text-[11px]">
                              Standard authenticated session (No device passkey)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Auction Terms, Entry Fee, & Photos */}
                <div className="space-y-4">
                  {/* Auction Terms Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-slate-800 font-bold text-sm">
                      <Gavel size={16} className="text-blue-600" />
                      <h4>Auction Pricing & Schedule</h4>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Starting Price</span>
                        <strong className="text-base text-slate-900 font-black">
                          {auc
                            ? `${Number(auc.startingPrice).toLocaleString()} ETB`
                            : "Not scheduled yet"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Reserve Price</span>
                        <span className="font-semibold text-slate-800">
                          {auc?.reservePrice
                            ? `${Number(auc.reservePrice).toLocaleString()} ETB`
                            : "None (No Reserve)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Min Bid Increment</span>
                        <span className="font-semibold text-slate-800">
                          {auc
                            ? `${Number(auc.minBidIncrement).toLocaleString()} ETB`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Scheduled Starts At</span>
                        <span className="font-medium text-slate-800">
                          {auc ? new Date(auc.startAt).toLocaleString() : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Scheduled Ends At</span>
                        <span className="font-medium text-slate-800">
                          {auc ? new Date(auc.endAt).toLocaleString() : "—"}
                        </span>
                      </div>
                      {auc?.terms && (
                        <div className="border-t border-slate-200 pt-1 text-slate-600 text-[11px]">
                          <strong>Seller Terms:</strong> {auc.terms}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Entry Fee Payment Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                        <CreditCard size={16} className="text-emerald-600" />
                        <h4>Listing Entry Fee Verification</h4>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          fee?.status === "CONFIRMED" ||
                          reviewingListing.entryFeeStatus === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {fee?.status ||
                          reviewingListing.entryFeeStatus ||
                          "UNPAID"}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fee Amount</span>
                        <strong className="text-sm font-bold text-emerald-700">
                          {fee
                            ? `${Number(fee.amount).toLocaleString()} ${fee.currency || "ETB"}`
                            : "Pending quotation"}
                        </strong>
                      </div>
                      {fee?.ratePercent && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fee Rate</span>
                          <span className="text-slate-700">
                            {fee.ratePercent}% of starting price
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payment Method</span>
                        <span className="font-semibold text-slate-800">
                          {fee?.method || "BANK_TRANSFER"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">
                          Bank / Transaction Reference
                        </span>
                        <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                          {fee?.bankReference || fee?.txRef || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500">Transaction Link</span>
                        <span className="max-w-[65%] truncate font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                          {fee?.transactionUrl ? (
                            <a
                              href={fee.transactionUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open submitted transaction link"
                              className="inline-flex items-center gap-1 text-blue-700 underline decoration-dotted underline-offset-2 hover:text-blue-800"
                            >
                              Open transaction details
                              <ExternalLink size={12} />
                            </a>
                          ) : fee?.paymentProofMediaId ? (
                            <a
                              href={`/api/media/${encodeURIComponent(fee.paymentProofMediaId)}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open legacy uploaded payment receipt"
                              className="inline-flex items-center gap-1 text-blue-700 underline decoration-dotted underline-offset-2 hover:text-blue-800"
                            >
                              Open previous receipt
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      {!fee?.transactionUrl &&
                      !fee?.paymentProofMediaId &&
                      fee?.method === "CHAPA" ? (
                        <p className="text-[11px] text-emerald-700">
                          Online payment is verified through Chapa.
                        </p>
                      ) : !fee?.transactionUrl && !fee?.paymentProofMediaId ? (
                        <p className="text-[11px] text-amber-700">
                          No transaction link was submitted.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Photos & Video Preview */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                    <h4 className="font-bold text-slate-800">
                      Uploaded Photos & Media ({reviewingListing.images?.length || 0})
                    </h4>
                    {reviewingListing.images &&
                    reviewingListing.images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {reviewingListing.images.map((img, idx) => (
                          <a
                            key={idx}
                            href={img.url}
                            target="_blank"
                            rel="noreferrer"
                            className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white"
                          >
                            <img
                              src={img.url}
                              alt="Item"
                              className="w-full h-full object-cover hover:scale-105 transition"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-[11px]">No photos uploaded.</p>
                    )}

                    {reviewingListing.videoUrl && (
                      <div className="pt-2">
                        <p className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Video size={14} /> Item Video Post:
                        </p>
                        {reviewingListing.videoUrl.startsWith("/") ? (
                          <video
                            src={reviewingListing.videoUrl}
                            controls
                            preload="metadata"
                            className="w-full max-h-40 rounded-xl bg-black"
                          />
                        ) : (
                          <a
                            href={reviewingListing.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Open original social-media video post
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Item Description & Features */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <h4 className="font-bold text-slate-800">Item Description</h4>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {reviewingListing.description}
                </p>
                {reviewingListing.features &&
                  reviewingListing.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {reviewingListing.features.map((f, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
              </div>

              {/* Rejection Note & Actions */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rejection Reason (Required only if rejecting this listing)
                  </label>
                  <input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Unclear ownership deed, invalid national ID number, missing video..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (!rejectionReason.trim()) {
                        alert("Please specify a reason for rejection.");
                        return;
                      }
                      const formData = new FormData();
                      formData.append("listingId", reviewingListing.id);
                      formData.append("status", "REJECTED");
                      formData.append("rejectionReason", rejectionReason);
                      startTransition(async () => {
                        const res = await reviewListingAction(formData);
                        setActionMsg(res);
                        setReviewingListing(null);
                      });
                    }}
                    className="flex-1 rounded-xl border border-rose-200 py-3 font-bold text-rose-600 hover:bg-rose-50 transition"
                  >
                    Reject Listing
                  </button>
                  <button
                    onClick={() => {
                      const formData = new FormData();
                      formData.append("listingId", reviewingListing.id);
                      formData.append("status", "APPROVED");
                      startTransition(async () => {
                        const res = await reviewListingAction(formData);
                        setActionMsg(res);
                        setReviewingListing(null);
                      });
                    }}
                    className="flex-2 rounded-xl bg-emerald-600 py-3 px-6 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                  >
                    <Gavel size={16} />
                    Approve Full Listing & Launch to Live Bid
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────── MODAL: VERIFY PAYMENT ─────────────────── */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-blue-600">
                Verify Escrow Payment
              </span>
              <button onClick={() => setVerifyingPayment(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {verifyingPayment.auctionResult?.auction.listing.title && (
                <div>
                  <span className="text-slate-400 block">Property / Auction</span>
                  <strong className="text-slate-900">
                    {verifyingPayment.auctionResult.auction.listing.title}
                  </strong>
                </div>
              )}
              <div>
                <span className="text-slate-400 block">Payer</span>
                <strong className="text-slate-900">{verifyingPayment.payer?.name ?? "—"}</strong>
                {verifyingPayment.payer?.email && (
                  <span className="text-slate-500 block text-[11px]">{verifyingPayment.payer.email}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block">Reference No.</span>
                <span className="font-mono text-sm font-bold text-slate-800">
                  {verifyingPayment.transactionRef || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Deposit Amount</span>
                <span className="text-base font-bold text-emerald-600">
                  {Number(verifyingPayment.amount).toLocaleString()} {verifyingPayment.currency || "ETB"}
                </span>
              </div>
              {verifyingPayment.receiptUrl && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                  <span className="text-blue-900 font-semibold block mb-1">Bank Wire Slip / Receipt</span>
                  <a
                    href={verifyingPayment.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 underline text-xs"
                  >
                    Open payment slip in new tab <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Verification Notes
              </label>
              <input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Confirmed into bank escrow (e.g. CBE, Telebirr, Awash)..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-3 pt-2 text-xs">
              <button
                disabled={isPending}
                onClick={() => {
                  const formData = new FormData();
                  formData.append("paymentId", verifyingPayment.id);
                  formData.append("status", "FAILED");
                  formData.append("notes", paymentNote);
                  startTransition(async () => {
                    const res = await verifyPaymentAction(formData);
                    setActionMsg(res);
                    if (res.success) router.refresh();
                    setVerifyingPayment(null);
                  });
                }}
                className="flex-1 rounded-xl border border-rose-200 py-2.5 font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Mark Failed
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  const formData = new FormData();
                  formData.append("paymentId", verifyingPayment.id);
                  formData.append("status", "PAID");
                  formData.append("notes", paymentNote);
                  startTransition(async () => {
                    const res = await verifyPaymentAction(formData);
                    setActionMsg(res);
                    if (res.success) router.refresh();
                    setVerifyingPayment(null);
                  });
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
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
              <span className="font-bold text-blue-600">
                Resolve Dispute Ticket
              </span>
              <button onClick={() => setResolvingTicket(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-mono font-bold text-blue-600">
                {resolvingTicket.number}
              </span>
              <h4 className="font-bold text-slate-900">
                {resolvingTicket.subject}
              </h4>
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
            aria-labelledby="admin-bid-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Bid record</p>
                <h2 id="admin-bid-details-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {selectedBid.auction?.listing?.title || "Auction bid"}
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
                <dd className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{Number(selectedBid.amount).toLocaleString()} ETB</dd>
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
                <dt className="text-xs text-slate-500">Approved</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {selectedBid.approvedAt ? new Date(selectedBid.approvedAt).toLocaleString() : "Not approved"}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <dt className="text-xs text-slate-500">Auction status</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{selectedBid.auction?.status || "Unknown"}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <dt className="text-xs text-slate-500">Auction schedule</dt>
                <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                  {selectedBid.auction
                    ? `${new Date(selectedBid.auction.startAt).toLocaleString()} – ${new Date(selectedBid.auction.endAt).toLocaleString()}`
                    : "Unavailable"}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Bidder account</h3>
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
                  <dt className="text-xs text-slate-500">Role</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{selectedBid.bidder?.role || "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Account status</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{selectedBid.bidder?.status || "Unknown"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Bidder ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-600 dark:text-slate-300">{selectedBid.bidderId || "Unavailable"}</dd>
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
                      <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">{Number(selectedBid.payment.amount).toLocaleString()} {selectedBid.payment.currency}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Payment method</dt>
                      <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">{selectedBid.payment.method}</dd>
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
                        <dt className="text-xs text-slate-500">Verified</dt>
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
