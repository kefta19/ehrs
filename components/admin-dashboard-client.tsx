"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
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
  Home,
  Edit,
  Layers,
} from "lucide-react";
import { ETHomeLogo } from "./ethome-brand";
import { Pagination } from "./pagination";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import {
  reviewListingAction,
  updateAuctionStatusAction,
  updateTicketStatusAction,
  updateUserStatusAction,
  verifySellerKycAction,
  manageCategoryAction,
  updateSystemSettingsAction,
} from "@/app/actions/admin";
import { deleteNotificationAction } from "@/app/actions/buyer";
import { AccountManagement } from "@/components/account-management";
import { adminConfirmBuyerRegistrationAction } from "@/app/actions/bid-registration";
import {
  deleteListingAction,
  updateListingAction,
} from "@/app/actions/listing";

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
  idDocumentUrl?: string | null;
  createdAt: string;
};

type AdminBuyerRegistration = {
  id: string;
  buyerId: string;
  auctionId: string;
  feeAmount: number | string;
  currency: string;
  paymentMethod: string | null;
  paymentProofUrl: string | null;
  status: string;
  txRef: string | null;
  paidAt: string | null;
  createdAt: string;
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    createdAt: string;
    emailVerifiedAt: string | null;
    buyerProfile: {
      address: string | null;
      preferredLocation: string | null;
      idDocumentUrl: string | null;
      isVerified: boolean;
    } | null;
  };
  auction: { id: string; listing: { title: string } };
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

function getListingStatusClasses(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "bg-rose-50 text-rose-700";
    case "PENDING_REVIEW":
    case "UNDER_REVIEW":
      return "bg-amber-50 text-amber-700";
    case "AUCTIONED":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getListingStatusLabel(status: string) {
  return status === "PENDING_REVIEW" || status === "UNDER_REVIEW"
    ? "UNDER REVIEW"
    : status;
}

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
    startingPrice: number | string;
    reservePrice: number | string | null;
    minBidIncrement: number | string;
    currentHighestBid: number | string;
    terms: string | null;
    seller?: AdminUser & {
      sellerProfile?: {
        nationalIdNumber: string;
        businessName: string | null;
        taxId: string | null;
        address: string;
        idDocumentUrl: string | null;
        status: string;
      } | null;
    };
    listing?: {
      id: string;
      title: string;
      description: string;
      condition: string;
      address: string | null;
      city: string;
      region: string;
      country: string;
      postalCode: string | null;
      referenceNumber: string | null;
      features: string[];
      attributes: Record<string, unknown> | null;
      status: string;
      videoUrl: string | null;
      ownerNationalId: string | null;
      idDocumentMediaId: string | null;
      createdAt: string;
      category: { name: string };
      images: Array<{ id: string; url: string; isPrimary: boolean }>;
      documents: Array<{
        id: string;
        title: string;
        documentType: string;
        fileUrl: string;
        isVerified: boolean;
      }>;
      seller?: AdminUser & {
        sellerProfile?: {
          nationalIdNumber: string;
          businessName: string | null;
          taxId: string | null;
          address: string;
          idDocumentUrl: string | null;
          status: string;
        } | null;
      };
    };
  };
  bidder?: AdminUser & {
    emailVerifiedAt?: string | null;
    buyerProfile?: {
      address: string | null;
      preferredLocation: string | null;
      idDocumentUrl: string | null;
      isVerified: boolean;
    } | null;
  };
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

type AdminEntryFee = {
  id: string;
  role: "BUYER" | "SELLER";
  payer: { id: string; name: string; email: string };
  payerDetails: {
    phone: string | null;
    accountStatus: string;
    joinedAt: string;
    emailVerified: boolean;
    address: string | null;
    preferredLocation: string | null;
    isVerified: boolean;
    nationalIdNumber: string | null;
    businessName: string | null;
    taxId: string | null;
    identityAddress: string | null;
    idDocumentUrl: string | null;
    verificationStatus: string | null;
  };
  auctionTitle: string;
  amount: number;
  currency: string;
  method: string | null;
  status: string;
  transactionRef: string;
  transactionUrl: string | null;
  confirmedAt: string | null;
  createdAt: string;
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
  pendingListings,
  allAuctions,
  allBids,
  sellerProfiles,
  buyerRegistrations,
  entryFeePayments,
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
    pendingListingsCount: number;
    activeAuctionsCount: number;
    totalVolume: number;
    openTicketsCount: number;
  };
  usersList: AdminUser[];
  pendingListings: AdminListing[];
  allAuctions: AdminAuction[];
  allBids: AdminBid[];
  sellerProfiles: AdminSellerProfile[];
  buyerRegistrations: AdminBuyerRegistration[];
  entryFeePayments: AdminEntryFee[];
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
      "sellers",
      "buyers",
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
  const selectedBidListing = selectedBid?.auction?.listing;
  const selectedBidSeller =
    selectedBidListing?.seller ?? selectedBid?.auction?.seller;
  const [selectedBuyerRegistration, setSelectedBuyerRegistration] =
    useState<AdminBuyerRegistration | null>(null);
  const [buyerReviewNote, setBuyerReviewNote] = useState("");
  const pendingBuyerRegistrations = buyerRegistrations.filter(
    (registration) => registration.status === "PENDING",
  );
  const pendingSellerProfiles = sellerProfiles.filter(
    (seller) => seller.status === "PENDING" || seller.status === "UNDER_REVIEW",
  );

  // Search in users
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");



  // Listing Review Modal
  const [reviewingListing, setReviewingListing] = useState<AdminListing | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");

  // Edit Listing Modal
  const [showEditListingModal, setShowEditListingModal] = useState(false);
  const [selectedListingForEdit, setSelectedListingForEdit] =
    useState<AdminListing | null>(null);
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
  const [sellerReviewNotes, setSellerReviewNotes] = useState<
    Record<string, string>
  >({});

  // Local state for listings to avoid full page refresh
  const [localListings, setLocalListings] =
    useState<AdminListing[]>(pendingListings);

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  };

  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  // Pagination States for Admin Tabs
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);
  useEffect(() => {
    setUsersPage(1);
  }, [userSearch, userRoleFilter]);
  const usersTotal = filteredUsers.length;
  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersPageSize));
  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * usersPageSize,
    usersPage * usersPageSize,
  );

  const [listingsPage, setListingsPage] = useState(1);
  const [listingsPageSize, setListingsPageSize] = useState(6);
  const listingsTotal = pendingListings.length;
  const listingsTotalPages = Math.max(1, Math.ceil(listingsTotal / listingsPageSize));
  const paginatedListings = pendingListings.slice(
    (listingsPage - 1) * listingsPageSize,
    listingsPage * listingsPageSize,
  );

  const [auctionsPage, setAuctionsPage] = useState(1);
  const [auctionsPageSize, setAuctionsPageSize] = useState(10);
  const auctionsTotal = allAuctions.length;
  const auctionsTotalPages = Math.max(1, Math.ceil(auctionsTotal / auctionsPageSize));
  const paginatedAuctions = allAuctions.slice(
    (auctionsPage - 1) * auctionsPageSize,
    auctionsPage * auctionsPageSize,
  );

  const [bidsPage, setBidsPage] = useState(1);
  const [bidsPageSize, setBidsPageSize] = useState(15);
  const bidsTotal = allBids.length;
  const bidsTotalPages = Math.max(1, Math.ceil(bidsTotal / bidsPageSize));
  const paginatedBids = allBids.slice(
    (bidsPage - 1) * bidsPageSize,
    bidsPage * bidsPageSize,
  );

  const [entryFeePage, setEntryFeePage] = useState(1);
  const [entryFeePageSize, setEntryFeePageSize] = useState(10);
  const [selectedEntryFee, setSelectedEntryFee] =
    useState<AdminEntryFee | null>(null);
  const [entryFeeRoleFilter, setEntryFeeRoleFilter] = useState<
    "ALL" | AdminEntryFee["role"]
  >("ALL");
  const [entryFeeStatusFilter, setEntryFeeStatusFilter] = useState("ALL");
  const [entryFeeMethodFilter, setEntryFeeMethodFilter] = useState("ALL");
  const [entryFeeSearch, setEntryFeeSearch] = useState("");
  const entryFeeMethods = Array.from(
    new Set(
      entryFeePayments
        .map((fee) => fee.method)
        .filter((method): method is string => Boolean(method)),
    ),
  ).sort();
  const normalizedEntryFeeSearch = entryFeeSearch.trim().toLowerCase();
  const filteredEntryFeePayments = entryFeePayments.filter((fee) => {
    const matchesRole =
      entryFeeRoleFilter === "ALL" || fee.role === entryFeeRoleFilter;
    const matchesStatus =
      entryFeeStatusFilter === "ALL" || fee.status === entryFeeStatusFilter;
    const matchesMethod =
      entryFeeMethodFilter === "ALL" || fee.method === entryFeeMethodFilter;
    const matchesSearch =
      !normalizedEntryFeeSearch ||
      [
        fee.payer.name,
        fee.payer.email,
        fee.auctionTitle,
        fee.transactionRef,
      ].some((value) => value.toLowerCase().includes(normalizedEntryFeeSearch));

    return matchesRole && matchesStatus && matchesMethod && matchesSearch;
  });
  const resetEntryFeeFilters = () => {
    setEntryFeeRoleFilter("ALL");
    setEntryFeeStatusFilter("ALL");
    setEntryFeeMethodFilter("ALL");
    setEntryFeeSearch("");
    setEntryFeePage(1);
  };
  const entryFeeTotalPages = Math.max(
    1,
    Math.ceil(filteredEntryFeePayments.length / entryFeePageSize),
  );
  const paginatedEntryFeePayments = filteredEntryFeePayments.slice(
    (entryFeePage - 1) * entryFeePageSize,
    entryFeePage * entryFeePageSize,
  );
  const buyerEntryFeeCount = entryFeePayments.filter(
    (fee) => fee.role === "BUYER",
  ).length;
  const sellerEntryFeeCount = entryFeePayments.length - buyerEntryFeeCount;
  const entryFeeStatusCounts = [
    "UNPAID",
    "PENDING",
    "CONFIRMED",
    "FAILED",
    "SUPERSEDED",
    "PAID",
    "WAIVED",
    "REJECTED",
  ].map((status) => ({
      status,
      count: entryFeePayments.filter((fee) => fee.status === status).length,
    }));

  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsPageSize, setTicketsPageSize] = useState(10);
  const ticketsTotal = tickets.length;
  const ticketsTotalPages = Math.max(1, Math.ceil(ticketsTotal / ticketsPageSize));
  const paginatedTickets = tickets.slice(
    (ticketsPage - 1) * ticketsPageSize,
    ticketsPage * ticketsPageSize,
  );

  const [notifsPage, setNotifsPage] = useState(1);
  const [notifsPageSize, setNotifsPageSize] = useState(10);
  const notifsTotal = notifications.length;
  const notifsTotalPages = Math.max(1, Math.ceil(notifsTotal / notifsPageSize));
  const paginatedNotifications = notifications.slice(
    (notifsPage - 1) * notifsPageSize,
    notifsPage * notifsPageSize,
  );

  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(15);
  const auditTotal = auditLogs.length;
  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditPageSize));
  const paginatedAuditLogs = auditLogs.slice(
    (auditPage - 1) * auditPageSize,
    auditPage * auditPageSize,
  );

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
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-background text-foreground transition-transform duration-300 ease-in-out dark:border-slate-800 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
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
          <nav className="space-y-4 text-xs">
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Overview
              </div>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium text-slate-400 transition-all hover:bg-[#12233f] hover:text-white"
              >
                <Home size={16} />
                <span>Home Page</span>
              </Link>

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
            </div>

            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Platform Ops
              </div>
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
                onClick={() => selectTab("sellers")}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                  activeTab === "sellers"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} />
                  <span>Review Sellers</span>
                </div>
                {pendingSellerProfiles.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {pendingSellerProfiles.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => selectTab("buyers")}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                  activeTab === "buyers"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-[#12233f] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users size={16} />
                  <span>Approve Buyers</span>
                </div>
                {pendingBuyerRegistrations.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {pendingBuyerRegistrations.length}
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
            </div>

            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Finance & System
              </div>
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
            </div>

            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Account
              </div>
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
            </div>
          </nav>

          <Link
            href="/dashboard/settings/branding"
            onClick={() => setMobileMenuOpen(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white"
          >
            <Palette size={16} />
            <span>Branding</span>
          </Link>

          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((current) => !current)}
                className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-4 text-left transition-colors hover:text-slate-700"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-sm">
                  AD
                </div>
                <div className="text-left text-xs">
                  <div className="font-bold text-slate-900 dark:text-white leading-tight">
                    {user.name}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    System Administrator
                  </div>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => selectTab("account")}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Manage Account
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTab("settings")}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Platform Settings
                  </button>
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    <LogoutButton className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30" />
                  </div>
                </div>
              )}
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
        <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col p-4 sm:p-6 lg:p-8 xl:px-10 space-y-8">
          {/* ══════════════════ TAB 1: EXECUTIVE OVERVIEW ══════════════════ */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* 5 Stats Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-blue-600">
                    <Users size={20} />
                    <span className="text-[11px] text-slate-400">Total</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 font-medium">
                      Registered Users
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {stats.totalUsers}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-amber-600">
                    <Layers size={20} />
                    <span className="text-[11px] text-amber-600 font-semibold">
                      Review
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 font-medium">
                      Pending Listings
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {stats.pendingListingsCount}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-emerald-600">
                    <Gavel size={20} />
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Active
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 font-medium">
                      Live Auctions
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {stats.activeAuctionsCount}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-purple-600">
                    <DollarSign size={20} />
                    <span className="text-[11px] text-slate-400">GMV</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 font-medium">
                      Platform Volume
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {stats.totalVolume.toLocaleString()} ETB
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-rose-600">
                    <MessageSquareWarning size={20} />
                    <span className="text-[11px] text-rose-600 font-semibold">
                      Action
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 font-medium">
                      Open Disputes
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {stats.openTicketsCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Queues: Listing Approvals */}
              <div className="grid grid-cols-1 gap-6">
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
                            onClick={() => {
                              setReviewingListing(l);
                              setActiveTab("listings");
                            }}
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
                    {paginatedUsers.map((u) => (
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

          {activeTab === "sellers" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Seller List &amp; Verification Reviews
                </h2>
                <p className="text-xs text-slate-500">
                  View all seller profiles and their verification status.
                  Pending sellers can be reviewed and approved or rejected.
                </p>
              </div>

              {sellerProfiles.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                  No seller profiles found.
                </p>
              ) : (
                <div className="space-y-4">
                  {sellerProfiles.map((seller) => (
                    <section
                      key={seller.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {seller.businessName || seller.user.name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {seller.user.name} · {seller.user.email}
                              {seller.user.phone ? ` · ${seller.user.phone}` : ""}
                            </p>
                            <span
                              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                seller.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : seller.status === "REJECTED"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {seller.status}
                            </span>
                          </div>
                          <div className="grid gap-x-8 gap-y-2 text-xs text-slate-600 sm:grid-cols-2">
                            <p>
                              <span className="font-semibold">National ID:</span>{" "}
                              {seller.nationalIdNumber}
                            </p>
                            <p>
                              <span className="font-semibold">Tax ID:</span>{" "}
                              {seller.taxId || "Not provided"}
                            </p>
                            <p>
                              <span className="font-semibold">Address:</span>{" "}
                              {seller.address}
                            </p>
                            <p>
                              <span className="font-semibold">Submitted:</span>{" "}
                              {new Date(seller.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {seller.idDocumentUrl && (
                            <a
                              href={seller.idDocumentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline"
                            >
                              View identity document <ExternalLink size={12} />
                            </a>
                          )}
                          {(seller.status === "PENDING" ||
                            seller.status === "UNDER_REVIEW") && (
                            <label className="block text-xs font-medium text-slate-600">
                              Review note
                              <textarea
                                value={sellerReviewNotes[seller.id] || ""}
                                maxLength={500}
                                onChange={(event) =>
                                  setSellerReviewNotes((previous) => ({
                                    ...previous,
                                    [seller.id]: event.target.value,
                                  }))
                                }
                                placeholder="Optional note, or explain what needs correction if rejecting"
                                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                rows={2}
                              />
                            </label>
                          )}
                        </div>

                        {(seller.status === "PENDING" ||
                          seller.status === "UNDER_REVIEW") && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              const formData = new FormData();
                              formData.append("sellerProfileId", seller.id);
                              formData.append("status", "REJECTED");
                              formData.append(
                                "reviewNote",
                                sellerReviewNotes[seller.id] || "",
                              );
                              startTransition(async () => {
                                const result = await verifySellerKycAction(formData);
                                setActionMsg(result);
                                if (result.success) router.refresh();
                              });
                            }}
                            className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              const formData = new FormData();
                              formData.append("sellerProfileId", seller.id);
                              formData.append("status", "APPROVED");
                              formData.append(
                                "reviewNote",
                                sellerReviewNotes[seller.id] || "",
                              );
                              startTransition(async () => {
                                const result = await verifySellerKycAction(formData);
                                setActionMsg(result);
                                if (result.success) router.refresh();
                              });
                            }}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve Seller
                          </button>
                        </div>
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "buyers" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Buyer Registration List
                </h2>
                <p className="text-xs text-slate-500">
                  View buyer registrations and their entry-fee approval status.
                  Pending records can be reviewed and decided here.
                </p>
              </div>

              {buyerRegistrations.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                  No buyer registrations found.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="p-4 font-semibold">Buyer</th>
                        <th className="p-4 font-semibold">Auction</th>
                        <th className="p-4 font-semibold">Entry fee</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Submitted</th>
                        <th className="p-4 text-right font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {buyerRegistrations.map((registration) => (
                        <tr
                          key={registration.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="p-4">
                            <div className="font-semibold text-slate-900">
                              {registration.buyer.name}
                            </div>
                            <div className="text-slate-500">
                              {registration.buyer.email}
                            </div>
                          </td>
                          <td className="p-4 text-slate-700">
                            {registration.auction.listing.title}
                          </td>
                          <td className="p-4 font-semibold text-slate-900">
                            {Number(registration.feeAmount).toLocaleString()}{" "}
                            {registration.currency}
                          </td>
                          <td className="p-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                registration.status === "PAID" ||
                                registration.status === "WAIVED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : registration.status === "REJECTED"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {registration.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">
                            {new Date(
                              registration.createdAt,
                            ).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setBuyerReviewNote("");
                                setSelectedBuyerRegistration(registration);
                              }}
                              className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
                            >
                              {registration.status === "PENDING"
                                ? "Review Buyer"
                                : "View Details"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedBuyerRegistration && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setSelectedBuyerRegistration(null);
                    }
                  }}
                >
                  <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="buyer-review-title"
                    className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                  >
                    <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3
                          id="buyer-review-title"
                          className="text-lg font-bold text-slate-900"
                        >
                          Review Buyer Application
                        </h3>
                        <p className="text-xs text-slate-500">
                          Check the buyer profile and payment evidence before
                          making a decision.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBuyerRegistration(null)}
                        aria-label="Close buyer review"
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 p-4">
                        <h4 className="mb-3 text-sm font-bold text-slate-900">
                          Buyer information
                        </h4>
                        <dl className="space-y-2 text-xs">
                          <div>
                            <dt className="text-slate-500">Full name</dt>
                            <dd className="font-semibold text-slate-900">
                              {selectedBuyerRegistration.buyer.name}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Email</dt>
                            <dd className="font-semibold text-slate-900">
                              {selectedBuyerRegistration.buyer.email}
                              {selectedBuyerRegistration.buyer.emailVerifiedAt
                                ? " (verified)"
                                : " (not verified)"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Phone</dt>
                            <dd className="text-slate-900">
                              {selectedBuyerRegistration.buyer.phone ||
                                "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Address</dt>
                            <dd className="text-slate-900">
                              {selectedBuyerRegistration.buyer.buyerProfile
                                ?.address || "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Preferred location
                            </dt>
                            <dd className="text-slate-900">
                              {selectedBuyerRegistration.buyer.buyerProfile
                                ?.preferredLocation || "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Account status</dt>
                            <dd className="text-slate-900">
                              {selectedBuyerRegistration.buyer.status}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Registered</dt>
                            <dd className="text-slate-900">
                              {new Date(
                                selectedBuyerRegistration.buyer.createdAt,
                              ).toLocaleString()}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Buyer profile</dt>
                            <dd className="text-slate-900">
                              {selectedBuyerRegistration.buyer.buyerProfile
                                ?.isVerified
                                ? "Verified"
                                : "Not verified"}
                            </dd>
                          </div>
                        </dl>
                        {selectedBuyerRegistration.buyer.buyerProfile
                          ?.idDocumentUrl && (
                          <a
                            href={
                              selectedBuyerRegistration.buyer.buyerProfile
                                .idDocumentUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline"
                          >
                            View buyer ID document <ExternalLink size={12} />
                          </a>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <h4 className="mb-3 text-sm font-bold text-slate-900">
                          Entry-fee payment
                        </h4>
                        <dl className="space-y-2 text-xs">
                          <div>
                            <dt className="text-slate-500">Auction / listing</dt>
                            <dd className="font-semibold text-slate-900">
                              {selectedBuyerRegistration.auction.listing.title}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Fee amount</dt>
                            <dd className="font-semibold text-slate-900">
                              {Number(
                                selectedBuyerRegistration.feeAmount,
                              ).toLocaleString()}{" "}
                              {selectedBuyerRegistration.currency}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Status</dt>
                            <dd className="font-semibold text-amber-700">
                              {selectedBuyerRegistration.status}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Payment method</dt>
                            <dd className="text-slate-900">
                              {selectedBuyerRegistration.paymentMethod ||
                                "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Transaction reference
                            </dt>
                            <dd className="break-all font-mono text-slate-900">
                              {selectedBuyerRegistration.txRef ||
                                "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Submitted</dt>
                            <dd className="text-slate-900">
                              {new Date(
                                selectedBuyerRegistration.createdAt,
                              ).toLocaleString()}
                            </dd>
                          </div>
                        </dl>
                        {selectedBuyerRegistration.paymentProofUrl ? (
                          <a
                            href={selectedBuyerRegistration.paymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 underline"
                          >
                            Open transaction evidence{" "}
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                            No transaction evidence was submitted. Approval is
                            unavailable until valid evidence is provided.
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedBuyerRegistration.status === "PENDING" ? (
                      <>
                        <label className="block text-xs font-medium text-slate-600">
                          Review note
                          <textarea
                            value={buyerReviewNote}
                            onChange={(event) =>
                              setBuyerReviewNote(event.target.value)
                            }
                            maxLength={500}
                            placeholder="Optional note, or explain what needs correction if rejecting"
                            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                            rows={2}
                          />
                        </label>

                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                const result =
                                  await adminConfirmBuyerRegistrationAction(
                                    selectedBuyerRegistration.id,
                                    "REJECTED",
                                    buyerReviewNote,
                                  );
                                setActionMsg(result);
                                if (result.success) {
                                  setSelectedBuyerRegistration(null);
                                  router.refresh();
                                }
                              });
                            }}
                            className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            Reject Buyer
                          </button>
                          <button
                            type="button"
                            disabled={
                              isPending ||
                              !selectedBuyerRegistration.paymentMethod ||
                              !selectedBuyerRegistration.paymentProofUrl ||
                              !selectedBuyerRegistration.txRef ||
                              Number(selectedBuyerRegistration.feeAmount) <= 0
                            }
                            onClick={() => {
                              startTransition(async () => {
                                const result =
                                  await adminConfirmBuyerRegistrationAction(
                                    selectedBuyerRegistration.id,
                                    "PAID",
                                    buyerReviewNote,
                                  );
                                setActionMsg(result);
                                if (result.success) {
                                  setSelectedBuyerRegistration(null);
                                  router.refresh();
                                }
                              });
                            }}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Approve Buyer
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-end border-t border-slate-100 pt-4">
                        <span className="text-xs font-semibold text-slate-600">
                          Registration status:{" "}
                          {selectedBuyerRegistration.status}
                        </span>
                      </div>
                    )}
                  </section>
                </div>
              )}
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
                {localListings.map((l) => (
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
                      <span
                        className={`rounded px-2 py-0.5 font-bold ${getListingStatusClasses(l.status)}`}
                      >
                        {getListingStatusLabel(l.status)}
                      </span>
                      <div className="flex items-center gap-2">
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
                                  const result = await deleteListingAction(
                                    l.id,
                                  );
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
                          onClick={() => {
                            setReviewingListing(l);
                            setRejectionReason("");
                          }}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                        >
                          Inspect & Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={listingsPage}
                totalPages={listingsTotalPages}
                totalItems={listingsTotal}
                pageSize={listingsPageSize}
                onPageChange={setListingsPage}
                onPageSizeChange={setListingsPageSize}
                pageSizeOptions={[6, 12, 24]}
                itemName="listings"
                className="mt-6 pt-4 border-t border-slate-100"
              />
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
                    {paginatedAuctions.map((a) => (
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
              <Pagination
                currentPage={auctionsPage}
                totalPages={auctionsTotalPages}
                totalItems={auctionsTotal}
                pageSize={auctionsPageSize}
                onPageChange={setAuctionsPage}
                onPageSizeChange={setAuctionsPageSize}
                pageSizeOptions={[10, 25, 50]}
                itemName="auctions"
                className="mt-4 pt-3 border-t border-slate-100"
              />
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
                    {paginatedBids.map((b) => (
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
                            onClick={() => {
                              setSelectedBid(b);
                              setActiveTab("bids");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            <Eye size={13} /> View details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {allBids.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-sm text-slate-500"
                        >
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
                    Buyer &amp; Seller Entry Fee Payers
                  </h2>
                  <p className="text-xs text-slate-500">
                    All buyer and seller entry-fee records, including unpaid,
                    pending, and confirmed payments.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    { label: "Total records", value: entryFeePayments.length },
                    { label: "Buyer records", value: buyerEntryFeeCount },
                    { label: "Seller records", value: sellerEntryFeeCount },
                    ...entryFeeStatusCounts.map(({ status, count }) => ({
                      label: status,
                      value: count,
                    })),
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs font-medium text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {stat.value.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(event) => event.preventDefault()}
                  className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-5"
                  aria-label="Filter entry-fee records"
                >
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    Search payer, email, listing, or reference
                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="search"
                        value={entryFeeSearch}
                        onChange={(event) => {
                          setEntryFeeSearch(event.target.value);
                          setEntryFeePage(1);
                        }}
                        placeholder="Type to search..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    Payer type
                    <select
                      value={entryFeeRoleFilter}
                      onChange={(event) => {
                        setEntryFeeRoleFilter(
                          event.target.value as "ALL" | AdminEntryFee["role"],
                        );
                        setEntryFeePage(1);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                    >
                      <option value="ALL">All payers</option>
                      <option value="BUYER">Buyers ({buyerEntryFeeCount})</option>
                      <option value="SELLER">
                        Sellers ({sellerEntryFeeCount})
                      </option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    Payment status
                    <select
                      value={entryFeeStatusFilter}
                      onChange={(event) => {
                        setEntryFeeStatusFilter(event.target.value);
                        setEntryFeePage(1);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                    >
                      <option value="ALL">All statuses</option>
                      {entryFeeStatusCounts.map(({ status, count }) => (
                        <option key={status} value={status}>
                          {status} ({count})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    Payment method
                    <select
                      value={entryFeeMethodFilter}
                      onChange={(event) => {
                        setEntryFeeMethodFilter(event.target.value);
                        setEntryFeePage(1);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                    >
                      <option value="ALL">All methods</option>
                      {entryFeeMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={resetEntryFeeFilters}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Reset filters
                    </button>
                  </div>
                </form>

                {filteredEntryFeePayments.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No entry-fee records found for this selection.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400">
                          <th className="pb-3 font-semibold">Payer</th>
                          <th className="pb-3 font-semibold">Auction / Listing</th>
                          <th className="pb-3 font-semibold">Amount</th>
                          <th className="pb-3 font-semibold">Method</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold">Date</th>
                          <th className="pb-3 font-semibold">Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedEntryFeePayments.map((fee) => (
                          <tr key={`${fee.role}-${fee.id}`} className="hover:bg-slate-50">
                            <td className="py-3">
                              <span
                                className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  fee.role === "BUYER"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-violet-50 text-violet-700"
                                }`}
                              >
                                {fee.role}
                              </span>
                              <div className="font-medium text-slate-900">
                                {fee.payer.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {fee.payer.email}
                              </div>
                            </td>
                            <td className="py-3 text-slate-700">
                              {fee.auctionTitle}
                            </td>
                            <td className="py-3 font-semibold text-slate-900">
                              {fee.amount.toLocaleString()} {fee.currency}
                            </td>
                            <td className="py-3 text-slate-600">
                              {fee.method || "—"}
                            </td>
                            <td className="py-3">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  fee.status === "CONFIRMED" ||
                                  fee.status === "PAID"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : fee.status === "FAILED"
                                      ? "bg-rose-50 text-rose-700"
                                      : fee.status === "UNPAID"
                                        ? "bg-slate-100 text-slate-700"
                                        : fee.status === "SUPERSEDED"
                                          ? "bg-violet-50 text-violet-700"
                                              : fee.status === "REJECTED"
                                                ? "bg-rose-50 text-rose-700"
                                                  : fee.status === "WAIVED"
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {fee.status}
                              </span>
                            </td>
                            <td className="py-3 text-slate-600">
                              {new Date(fee.confirmedAt || fee.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => setSelectedEntryFee(fee)}
                                className="inline-flex items-center gap-1 font-semibold text-blue-600 underline"
                              >
                                View <ExternalLink size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination
                  currentPage={entryFeePage}
                  totalPages={entryFeeTotalPages}
                  totalItems={filteredEntryFeePayments.length}
                  pageSize={entryFeePageSize}
                  onPageChange={setEntryFeePage}
                  onPageSizeChange={setEntryFeePageSize}
                  pageSizeOptions={[10, 25, 50]}
                  itemName="entry-fee records"
                  className="pt-2 border-t border-slate-100"
                />
              </section>

              {selectedEntryFee && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setSelectedEntryFee(null);
                    }
                  }}
                >
                  <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="entry-fee-details-title"
                    className="max-h-[90vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                  >
                    <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                      <div>
                        <div
                          className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            selectedEntryFee.role === "BUYER"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {selectedEntryFee.role}
                        </div>
                        <h3
                          id="entry-fee-details-title"
                          className="text-lg font-bold text-slate-900"
                        >
                          {selectedEntryFee.payer.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Complete payer and entry-fee details
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedEntryFee(null)}
                        aria-label="Close payment details"
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <section className="rounded-xl border border-slate-200 p-4">
                        <h4 className="mb-3 text-sm font-bold text-slate-900">
                          Payer information
                        </h4>
                        <dl className="space-y-2 text-xs">
                          <div>
                            <dt className="text-slate-500">Full name</dt>
                            <dd className="font-semibold text-slate-900">
                              {selectedEntryFee.payer.name}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Email</dt>
                            <dd className="break-all text-slate-900">
                              {selectedEntryFee.payer.email}
                              {selectedEntryFee.role === "BUYER"
                                ? selectedEntryFee.payerDetails.emailVerified
                                  ? " (verified)"
                                  : " (not verified)"
                                : ""}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Phone</dt>
                            <dd className="text-slate-900">
                              {selectedEntryFee.payerDetails.phone ||
                                "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Account status</dt>
                            <dd className="text-slate-900">
                              {selectedEntryFee.payerDetails.accountStatus}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Account created</dt>
                            <dd className="text-slate-900">
                              {new Date(
                                selectedEntryFee.payerDetails.joinedAt,
                              ).toLocaleString()}
                            </dd>
                          </div>
                          {selectedEntryFee.role === "BUYER" ? (
                            <>
                              <div>
                                <dt className="text-slate-500">Address</dt>
                                <dd className="text-slate-900">
                                  {selectedEntryFee.payerDetails.address ||
                                    "Not provided"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">
                                  Preferred location
                                </dt>
                                <dd className="text-slate-900">
                                  {selectedEntryFee.payerDetails
                                    .preferredLocation || "Not provided"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">
                                  Buyer profile verification
                                </dt>
                                <dd className="text-slate-900">
                                  {selectedEntryFee.payerDetails.isVerified
                                    ? "Verified"
                                    : "Not verified"}
                                </dd>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <dt className="text-slate-500">Business name</dt>
                                <dd className="text-slate-900">
                                  {selectedEntryFee.payerDetails.businessName ||
                                    "Not provided"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">National ID</dt>
                                <dd className="text-slate-900">
                                  {selectedEntryFee.payerDetails.nationalIdNumber ||
                                    "Not provided"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">Tax ID</dt>
                                <dd className="text-slate-900">
                                  {selectedEntryFee.payerDetails.taxId ||
                                    "Not provided"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">
                                  Seller address
                                </dt>
                                <dd className="text-slate-900">
                                  {selectedEntryFee.payerDetails.identityAddress ||
                                    "Not provided"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">
                                  Seller verification
                                </dt>
                                <dd className="text-slate-900">
                                  {selectedEntryFee.payerDetails
                                    .verificationStatus || "No profile"}
                                </dd>
                              </div>
                            </>
                          )}
                        </dl>
                        {selectedEntryFee.payerDetails.idDocumentUrl ? (
                          <a
                            href={selectedEntryFee.payerDetails.idDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 underline"
                          >
                            Open identification document{" "}
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <p className="mt-4 text-xs text-slate-400">
                            No identification document available.
                          </p>
                        )}
                      </section>

                      <section className="rounded-xl border border-slate-200 p-4">
                        <h4 className="mb-3 text-sm font-bold text-slate-900">
                          Entry-fee payment details
                        </h4>
                        <dl className="space-y-2 text-xs">
                          <div>
                            <dt className="text-slate-500">Auction / listing</dt>
                            <dd className="font-semibold text-slate-900">
                              {selectedEntryFee.auctionTitle}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Amount</dt>
                            <dd className="font-semibold text-slate-900">
                              {selectedEntryFee.amount.toLocaleString()}{" "}
                              {selectedEntryFee.currency}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Payment status</dt>
                            <dd className="font-semibold text-slate-900">
                              {selectedEntryFee.status}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Payment method</dt>
                            <dd className="text-slate-900">
                              {selectedEntryFee.method || "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Transaction reference
                            </dt>
                            <dd className="break-all font-mono text-slate-900">
                              {selectedEntryFee.transactionRef}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Submitted</dt>
                            <dd className="text-slate-900">
                              {new Date(
                                selectedEntryFee.createdAt,
                              ).toLocaleString()}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">
                              Confirmed / paid at
                            </dt>
                            <dd className="text-slate-900">
                              {selectedEntryFee.confirmedAt
                                ? new Date(
                                    selectedEntryFee.confirmedAt,
                                  ).toLocaleString()
                                : "Not confirmed"}
                            </dd>
                          </div>
                        </dl>
                        {selectedEntryFee.transactionUrl ? (
                          <a
                            href={selectedEntryFee.transactionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 underline"
                          >
                            Open transaction evidence{" "}
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                            No transaction evidence link is available for this
                            payment record.
                          </p>
                        )}
                      </section>
                    </div>
                  </section>
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
                {paginatedTickets.map((t) => (
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
              <Pagination
                currentPage={ticketsPage}
                totalPages={ticketsTotalPages}
                totalItems={ticketsTotal}
                pageSize={ticketsPageSize}
                onPageChange={setTicketsPage}
                onPageSizeChange={setTicketsPageSize}
                pageSizeOptions={[10, 20, 50]}
                itemName="tickets"
                className="mt-6 pt-4 border-t border-slate-100"
              />
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
                  Delete a notification from your account. This does not delete
                  its related inquiry or other users&apos; notifications.
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
                  {paginatedNotifications.map((notification) => (
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
                          if (
                            !window.confirm(
                              "Delete this notification? This will not delete the inquiry or other users’ copies.",
                            )
                          )
                            return;
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
              <Pagination
                currentPage={notifsPage}
                totalPages={notifsTotalPages}
                totalItems={notifsTotal}
                pageSize={notifsPageSize}
                onPageChange={setNotifsPage}
                onPageSizeChange={setNotifsPageSize}
                pageSizeOptions={[5, 10, 20]}
                itemName="notifications"
                className="mt-6 pt-4 border-t border-slate-100"
              />
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
                    {paginatedAuditLogs.map((a) => (
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
              <Pagination
                currentPage={auditPage}
                totalPages={auditTotalPages}
                totalItems={auditTotal}
                pageSize={auditPageSize}
                onPageChange={setAuditPage}
                onPageSizeChange={setAuditPageSize}
                pageSizeOptions={[10, 25, 50]}
                itemName="audit records"
                className="mt-4 pt-3 border-t border-slate-100"
              />
            </div>
          )}
        </main>
      </div>

      {/* ─────────────────── FULL-PAGE LISTING REVIEW ─────────────────── */}
      {reviewingListing &&
        (() => {
          const auc = reviewingListing.auctions?.[0];
          const fee = reviewingListing.entryFees?.[0] || auc?.entryFees?.[0];
          const profile = reviewingListing.seller.sellerProfile;
          const nationalId =
            reviewingListing.ownerNationalId || profile?.nationalIdNumber;

          return (
            <div className="fixed inset-0 z-40 overflow-y-auto bg-background text-slate-800 dark:text-slate-100 lg:pl-64">
              <div className="mx-auto min-h-screen w-full max-w-[1800px] p-4 sm:p-6 lg:p-8 xl:px-10">
                <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-blue-100 px-3 py-0.5 font-bold text-blue-700 text-[11px]">
                        {reviewingListing.category.name}
                      </span>
                      <span
                        className={`rounded-full px-3 py-0.5 font-bold text-[11px] ${getListingStatusClasses(reviewingListing.status)}`}
                      >
                        STATUS: {getListingStatusLabel(reviewingListing.status)}
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
                      {reviewingListing.region
                        ? `, ${reviewingListing.region}`
                        : ""}
                      {reviewingListing.address
                        ? ` • ${reviewingListing.address}`
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReviewingListing(null);
                      setRejectionReason("");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <X size={16} />
                    Back to listings
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
                          <span className="text-slate-500">
                            Business / Trade Name
                          </span>
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
                          <span className="text-slate-500">
                            Registered Address
                          </span>
                          <span className="text-slate-700 text-right max-w-[200px] truncate">
                            {profile?.address ||
                              reviewingListing.address ||
                              "—"}
                          </span>
                        </div>

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
                          <span className="text-slate-500">
                            National ID Number
                          </span>
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {nationalId || "Not recorded"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">
                            National ID Document
                          </span>
                          {reviewingListing.idDocumentMediaId ? (
                            <a
                              href={`/api/media/${reviewingListing.idDocumentMediaId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 font-bold text-blue-600 hover:underline bg-white px-2.5 py-1 rounded-lg border border-blue-200"
                            >
                              <FileText size={13} /> View ID Document
                            </a>
                          )  : (
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
                              <Fingerprint
                                size={18}
                                className="text-emerald-600"
                              />
                              <div>
                                <p className="font-bold">
                                  Passkey Fingerprint Signed on Device
                                </p>
                                <p className="text-[10px] text-emerald-600">
                                  Method:{" "}
                                  {reviewingListing.biometricVerification
                                    .method || "WebAuthn"}{" "}
                                  ·{" "}
                                  {new Date(
                                    reviewingListing.biometricVerification
                                      .createdAt!,
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-amber-800 border border-amber-200">
                              <ShieldCheck
                                size={18}
                                className="text-amber-600"
                              />
                              <p className="text-[11px]">
                                Standard authenticated session (No device
                                passkey)
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
                          <span className="text-slate-500">
                            Min Bid Increment
                          </span>
                          <span className="font-semibold text-slate-800">
                            {auc
                              ? `${Number(auc.minBidIncrement).toLocaleString()} ETB`
                              : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Scheduled Starts At
                          </span>
                          <span className="font-medium text-slate-800">
                            {auc ? new Date(auc.startAt).toLocaleString() : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Scheduled Ends At
                          </span>
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
                          <span className="text-slate-500">
                            Transaction Link
                          </span>
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
                        ) : !fee?.transactionUrl &&
                          !fee?.paymentProofMediaId ? (
                          <p className="text-[11px] text-amber-700">
                            No transaction link was submitted.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Photos & Video Preview */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                      <h4 className="font-bold text-slate-800">
                        Uploaded Photos & Media (
                        {reviewingListing.images?.length || 0})
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
                        <p className="text-slate-400 text-[11px]">
                          No photos uploaded.
                        </p>
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
                  className={`rounded-lg p-3 text-sm ${
                    editListingMessage.error
                      ? "bg-rose-50 text-rose-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {editListingMessage.error || editListingMessage.message}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Title
                </label>
                <input
                  type="text"
                  value={editListingForm.title}
                  onChange={(e) =>
                    setEditListingForm({
                      ...editListingForm,
                      title: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white"
                  placeholder="Enter listing title"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Description
                </label>
                <textarea
                  value={editListingForm.description}
                  onChange={(e) =>
                    setEditListingForm({
                      ...editListingForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white min-h-[120px]"
                  placeholder="Enter detailed description"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                    City
                  </label>
                  <input
                    type="text"
                    value={editListingForm.city}
                    onChange={(e) =>
                      setEditListingForm({
                        ...editListingForm,
                        city: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                    Region
                  </label>
                  <input
                    type="text"
                    value={editListingForm.region}
                    onChange={(e) =>
                      setEditListingForm({
                        ...editListingForm,
                        region: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white"
                    placeholder="Region"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Address
                </label>
                <input
                  type="text"
                  value={editListingForm.address}
                  onChange={(e) =>
                    setEditListingForm({
                      ...editListingForm,
                      address: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white"
                  placeholder="Full address"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Features (comma-separated)
                </label>
                <input
                  type="text"
                  value={editListingForm.features.join(", ")}
                  onChange={(e) =>
                    setEditListingForm({
                      ...editListingForm,
                      features: e.target.value
                        .split(",")
                        .map((f) => f.trim())
                        .filter(Boolean),
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
                      const result = await updateListingAction(
                        selectedListingForEdit.id,
                        editListingForm,
                      );
                      setEditListingMessage(result);
                      if (result.success) {
                        // Update local state instead of full page refresh
                        setLocalListings((prevListings) =>
                          prevListings.map((l) =>
                            l.id === selectedListingForEdit.id
                              ? { ...l, ...editListingForm }
                              : l,
                          ),
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
          className="fixed inset-0 z-40 overflow-y-auto bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:pl-64"
        >
          <div className="mx-auto min-h-screen w-full max-w-[1800px] p-4 sm:p-6 lg:p-8 xl:px-10">
            <section
              aria-labelledby="admin-bid-details-title"
              className="space-y-6"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedBid(null)}
                      className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <span aria-hidden="true">←</span>
                      Back to live bids
                    </button>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                      Live bid review
                    </p>
                    <h1
                      id="admin-bid-details-title"
                      className="mt-1 text-2xl font-bold text-slate-900 dark:text-white"
                    >
                      {selectedBid.auction?.listing?.title || "Auction bid"}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Review bidder, auction, listing, seller, and payment
                      information.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        selectedBid.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700"
                          : selectedBid.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {selectedBid.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBid(null)}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label="Close bid details and return to live bids"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>

            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-xs text-slate-500">Bid amount</dt>
                <dd className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {Number(selectedBid.amount).toLocaleString()} ETB
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-xs text-slate-500">Bid status</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {selectedBid.status}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-xs text-slate-500">Submitted</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {new Date(selectedBid.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-xs text-slate-500">Approved</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {selectedBid.approvedAt
                    ? new Date(selectedBid.approvedAt).toLocaleString()
                    : "Not approved"}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-xs text-slate-500">Auction status</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {selectedBid.auction?.status || "Unknown"}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-xs text-slate-500">Auction schedule</dt>
                <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                  {selectedBid.auction
                    ? `${new Date(selectedBid.auction.startAt).toLocaleString()} – ${new Date(selectedBid.auction.endAt).toLocaleString()}`
                    : "Unavailable"}
                </dd>
              </div>
            </dl>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Listing details
                </h3>
                {selectedBidListing ? (
                  <div className="mt-3 space-y-4">
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-slate-500">Category</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidListing.category.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Listing status</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidListing.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Condition</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidListing.condition}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Reference</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidListing.referenceNumber || "Not provided"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-slate-500">Location</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {[
                            selectedBidListing.address,
                            selectedBidListing.city,
                            selectedBidListing.region,
                            selectedBidListing.postalCode,
                            selectedBidListing.country,
                          ]
                            .filter(Boolean)
                            .join(", ") || "Not provided"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-slate-500">Description</dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidListing.description}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-slate-500">Features</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidListing.features.length
                            ? selectedBidListing.features.join(", ")
                            : "None provided"}
                        </dd>
                      </div>
                      {selectedBidListing.attributes &&
                        Object.keys(selectedBidListing.attributes).length >
                          0 && (
                          <div className="sm:col-span-2">
                            <dt className="text-xs text-slate-500">
                              Additional listing information
                            </dt>
                            <dd className="mt-1 grid gap-2 sm:grid-cols-2">
                              {Object.entries(
                                selectedBidListing.attributes,
                              ).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800"
                                >
                                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                                    {key}:{" "}
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-200">
                                    {typeof value === "string" ||
                                    typeof value === "number" ||
                                    typeof value === "boolean"
                                      ? String(value)
                                      : JSON.stringify(value)}
                                  </span>
                                </div>
                              ))}
                            </dd>
                          </div>
                        )}
                    </dl>

                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Listing photos ({selectedBidListing.images.length})
                      </h4>
                      {selectedBidListing.images.length ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {selectedBidListing.images.map((image) => (
                            <a
                              key={image.id}
                              href={image.url}
                              target="_blank"
                              rel="noreferrer"
                              className="relative aspect-square overflow-hidden rounded-lg border border-slate-200"
                            >
                              <img
                                src={image.url}
                                alt={`${selectedBidListing.title} listing`}
                                className="h-full w-full object-cover"
                              />
                              {image.isPrimary && (
                                <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
                                  Primary
                                </span>
                              )}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          No listing photos were uploaded.
                        </p>
                      )}
                    </div>

                    {selectedBidListing.videoUrl && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Listing video
                        </h4>
                        {selectedBidListing.videoUrl.startsWith("/") ? (
                          <video
                            src={selectedBidListing.videoUrl}
                            controls
                            preload="metadata"
                            className="max-h-72 w-full rounded-lg bg-black"
                          />
                        ) : (
                          <a
                            href={selectedBidListing.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-blue-700 underline dark:text-blue-300"
                          >
                            Open listing video
                          </a>
                        )}
                      </div>
                    )}

                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Ownership and listing documents
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedBidListing.idDocumentMediaId && (
                          <a
                            href={`/api/media/${encodeURIComponent(selectedBidListing.idDocumentMediaId)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-blue-700 underline dark:text-blue-300"
                          >
                            Open listing ID document
                          </a>
                        )}
                        {selectedBidListing.documents.map((document) => (
                          <a
                            key={document.id}
                            href={document.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-blue-700 underline dark:text-blue-300"
                          >
                            {document.title} ({document.documentType})
                            {document.isVerified ? " · Verified" : ""}
                          </a>
                        ))}
                        {!selectedBidListing.idDocumentMediaId &&
                          selectedBidListing.documents.length === 0 && (
                            <span className="text-sm text-slate-500">
                              No documents available.
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Listing details are unavailable for this bid.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Seller identity and contact
                </h3>
                {selectedBidSeller ? (
                  <>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-slate-500">Full name</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidSeller.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Email</dt>
                        <dd className="mt-1 break-all text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidSeller.email}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Phone</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidSeller.phone || "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Account status</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidSeller.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Business name</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidSeller.sellerProfile?.businessName ||
                            "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">National ID</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidListing?.ownerNationalId ||
                            selectedBidSeller.sellerProfile?.nationalIdNumber ||
                            "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Tax ID</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidSeller.sellerProfile?.taxId ||
                            "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Seller KYC status</dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidSeller.sellerProfile?.status ||
                            "No seller profile"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-slate-500">
                          Registered / business address
                        </dt>
                        <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                          {selectedBidSeller.sellerProfile?.address ||
                            selectedBidListing?.address ||
                            "Not provided"}
                        </dd>
                      </div>
                    </dl>
                    {selectedBidSeller.sellerProfile?.idDocumentUrl && (
                      <a
                        href={selectedBidSeller.sellerProfile.idDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-block text-sm font-semibold text-blue-700 underline dark:text-blue-300"
                      >
                        Open seller identity document
                      </a>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Seller details are unavailable for this auction.
                  </p>
                )}
              </section>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Bidder account
              </h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Name</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.name || "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Email</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.email || "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Role</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.role || "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Account status</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.status || "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Phone</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.phone || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Email verification</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.emailVerifiedAt
                      ? "Verified"
                      : "Not verified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Account created</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.createdAt
                      ? new Date(
                          selectedBid.bidder.createdAt,
                        ).toLocaleString()
                      : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Address</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.buyerProfile?.address ||
                      "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Preferred location</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.buyerProfile?.preferredLocation ||
                      "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Buyer verification</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedBid.bidder?.buyerProfile?.isVerified
                      ? "Verified"
                      : "Not verified"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Bidder ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-600 dark:text-slate-300">
                    {selectedBid.bidderId || "Unavailable"}
                  </dd>
                </div>
              </dl>
              {selectedBid.bidder?.buyerProfile?.idDocumentUrl && (
                <a
                  href={selectedBid.bidder.buyerProfile.idDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm font-semibold text-blue-700 underline dark:text-blue-300"
                >
                  Open bidder identification document
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Bid payment
              </h3>
              {selectedBid.payment ? (
                <>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-slate-500">Payment status</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {selectedBid.payment.status}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Payment amount</dt>
                      <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                        {Number(selectedBid.payment.amount).toLocaleString()}{" "}
                        {selectedBid.payment.currency}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Payment method</dt>
                      <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                        {selectedBid.payment.method}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        Transaction reference
                      </dt>
                      <dd className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                        {selectedBid.payment.transactionRef || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        Payment submitted
                      </dt>
                      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        {new Date(
                          selectedBid.payment.createdAt,
                        ).toLocaleString()}
                      </dd>
                    </div>
                    {selectedBid.payment.verifiedAt && (
                      <div>
                        <dt className="text-xs text-slate-500">Verified</dt>
                        <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                          {new Date(
                            selectedBid.payment.verifiedAt,
                          ).toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {selectedBid.payment.rejectionReason && (
                    <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                      Rejection reason: {selectedBid.payment.rejectionReason}
                    </p>
                  )}
                  {(selectedBid.payment.receiptUrl ||
                    selectedBid.payment.bankReferenceUrl) && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {selectedBid.payment.receiptUrl && (
                        <a
                          href={selectedBid.payment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-700 underline dark:text-blue-300"
                        >
                          Open receipt
                        </a>
                      )}
                      {selectedBid.payment.bankReferenceUrl && (
                        <a
                          href={selectedBid.payment.bankReferenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-700 underline dark:text-blue-300"
                        >
                          Open payment evidence
                        </a>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No bid payment record has been submitted.
                </p>
              )}
            </div>
            </section>
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
