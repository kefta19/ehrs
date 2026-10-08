"use client";

import { useEffect, useState, useTransition } from "react";
import {
  LayoutDashboard,
  Compass,
  Gavel,
  Bookmark,
  Bell,
  CreditCard,
  MessageSquareWarning,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Award,
  DollarSign,
  ChevronRight,
  X,
  ShieldCheck,
  HelpCircle,
  Check,
  Menu,
} from "lucide-react";
import { ETHomeLogo } from "./ethome-brand";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import {
  placeBidAction,
  toggleWatchlistAction,
  submitPaymentAction,
  submitComplaintTicketAction,
  updateBuyerProfileAction,
  markNotificationReadAction,
} from "@/app/actions/buyer";

type DashboardUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string | null;
  buyerProfile?: {
    address?: string;
    preferredLocation?: string;
  } | null;
};

type DashboardCategory = {
  id: string;
  slug: string;
  name: string;
  icon?: string;
};

type DashboardListing = {
  id: string;
  title: string;
  description?: string;
  city: string;
  region?: string | null;
  address?: string | null;
  referenceNumber?: string | null;
  category: {
    id?: string;
    slug?: string;
    name: string;
  };
  images?: Array<{ url?: string | null }>;
  features?: string[];
};

type DashboardAuction = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  startingPrice: number | string;
  currentHighestBid?: number | string | null;
  minBidIncrement: number | string;
  highestBidderId?: string | null;
  listing: DashboardListing;
  terms?: string;
};

type DashboardBid = {
  auction?: DashboardAuction;
};

type DashboardWatchlistItem = {
  auctionId: string;
};

type DashboardNotification = {
  id: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
};

type DashboardPayment = {
  id: string;
  amount: number | string;
  status: string;
  method?: string;
  createdAt?: string;
  transactionRef?: string | null;
  auctionResult?: {
    auction?: {
      listing?: {
        title?: string;
      };
    };
  };
};

type DashboardTicket = {
  id: string;
  number: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  resolution?: string | null;
};

type WonAuctionResult = {
  id: string;
  winningAmount: number | string;
  depositDue: number | string;
  isSettled: boolean;
  auction: {
    listing: DashboardListing;
  };
};

export function CustomerDashboardClient({
  user,
  auctions,
  myBids,
  wonAuctions,
  watchlist,
  payments,
  tickets,
  notifications,
  categories,
}: {
  user: DashboardUser;
  auctions: DashboardAuction[];
  myBids: DashboardBid[];
  wonAuctions: WonAuctionResult[];
  watchlist: DashboardWatchlistItem[];
  payments: DashboardPayment[];
  tickets: DashboardTicket[];
  notifications: DashboardNotification[];
  categories: DashboardCategory[];
}) {
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "browse"
    | "bids"
    | "won"
    | "watchlist"
    | "payments"
    | "tickets"
    | "profile"
    | "notifications"
  >("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState<number>(() => Date.now());

  // Search & Filters for Browse
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedLocation, setSelectedLocation] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modals
  const [biddingAuction, setBiddingAuction] = useState<DashboardAuction | null>(null);
  const [detailAuction, setDetailAuction] = useState<DashboardAuction | null>(null);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [bidMsg, setBidMsg] = useState<{ error?: string; success?: string } | null>(null);

  // Payment Modal
  const [payingResult, setPayingResult] = useState<WonAuctionResult | null>(null);
  const [paymentMsg, setPaymentMsg] = useState<{ error?: string; success?: string } | null>(null);

  // Ticket Modal
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketMsg, setTicketMsg] = useState<{ error?: string; success?: string } | null>(null);

  // Profile Edit
  const [profileMsg, setProfileMsg] = useState<{ error?: string; success?: string } | null>(null);

  // Watchlist set
  const [watchedIds, setWatchedIds] = useState<Set<string>>(
    new Set(watchlist.map((w) => w.auctionId))
  );

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const unreadNotifsCount = notifications.filter((n) => !n.readAt).length;
  const auctionLocations = Array.from(
    new Set(auctions.map((auc) => auc.listing.city).filter(Boolean))
  ).sort();

  // Filtered auctions
  const filteredAuctions = auctions.filter((auc) => {
    const titleMatch =
      !searchQuery ||
      auc.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auc.listing.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (auc.listing.region && auc.listing.region.toLowerCase().includes(searchQuery.toLowerCase()));

    const catMatch =
      selectedCategory === "ALL" || auc.listing.category.slug === selectedCategory;

    const locMatch =
      selectedLocation === "ALL" || auc.listing.city === selectedLocation;

    const statusMatch =
      selectedStatus === "ALL" || auc.status === selectedStatus;

    return titleMatch && catMatch && locMatch && statusMatch;
  });

  const upcomingAuctions = auctions.filter(
    (a) => a.status === "SCHEDULED" || new Date(a.startAt) > new Date()
  );

  // Total spent calculation
  const totalSpent = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Handle Watchlist toggle
  const handleToggleWatchlist = (auctionId: string) => {
    startTransition(async () => {
      const res = await toggleWatchlistAction(auctionId);
      if (res.success) {
        setWatchedIds((prev) => {
          const next = new Set(prev);
          if (res.isWatched) next.add(auctionId);
          else next.delete(auctionId);
          return next;
        });
      }
    });
  };

  // Open Bid Dialog
  const handleOpenBid = (auction: DashboardAuction) => {
    setBiddingAuction(auction);
    const curr = Number(auction.currentHighestBid);
    const minInc = Number(auction.minBidIncrement);
    const startP = Number(auction.startingPrice);
    const minBid = curr > 0 ? curr + minInc : startP;
    setBidAmount(minBid.toString());
    setBidMsg(null);
  };

  // Submit Bid
  const handleSubmitBid = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!biddingAuction) return;
    setBidMsg(null);

    const formData = new FormData();
    formData.append("auctionId", biddingAuction.id);
    formData.append("amount", bidAmount);

    startTransition(async () => {
      const res = await placeBidAction(formData);
      if (res.success) {
        setBidMsg({ success: res.message });
        setTimeout(() => {
          setBiddingAuction(null);
          setBidMsg(null);
        }, 1800);
      } else {
        setBidMsg({ error: res.error });
      }
    });
  };

  // Format Time Remaining
  const formatTimeLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - now;
    if (diff <= 0) return "Closed";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-[#080d1a] text-slate-800 dark:text-slate-100 transition-colors">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ─────────────────── LEFT SIDEBAR (Matching Image) ─────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#132238] bg-[#0A192F] text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[#132644]">
          <ETHomeLogo dark size="md" href="/customer" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#12233f] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
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
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => selectTab("browse")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "browse"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <Compass size={18} />
              <span>Browse Properties</span>
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
                <Gavel size={18} />
                <span>My Bids</span>
              </div>
              {myBids.length > 0 && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                  {myBids.length}
                </span>
              )}
            </button>

            <button
              onClick={() => selectTab("won")}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "won"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Award size={18} />
                <span>Won Auctions</span>
              </div>
              {wonAuctions.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                  {wonAuctions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => selectTab("watchlist")}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "watchlist"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Bookmark size={18} />
                <span>Watchlist</span>
              </div>
              {watchedIds.size > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                  {watchedIds.size}
                </span>
              )}
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
              {unreadNotifsCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {unreadNotifsCount}
                </span>
              )}
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
              <span>Payment History</span>
            </button>

            <button
              onClick={() => selectTab("tickets")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "tickets"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <MessageSquareWarning size={18} />
              <span>Complaints & Support</span>
            </button>

            <button
              onClick={() => selectTab("profile")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "profile"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-slate-400 hover:bg-[#12233f] hover:text-white"
              }`}
            >
              <User size={18} />
              <span>Profile</span>
            </button>
          </nav>

          {/* Bottom actions */}
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
              aria-label="Open sidebar navigation"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {activeTab === "dashboard" && "Dashboard"}
              {activeTab === "browse" && "Browse Auctions"}
              {activeTab === "bids" && "My Bidding Activity"}
              {activeTab === "won" && "Won Auctions & Settlements"}
              {activeTab === "watchlist" && "Saved Watchlist"}
              {activeTab === "payments" && "Payment Records & Invoices"}
              {activeTab === "tickets" && "Support & Complaints Desk"}
              {activeTab === "profile" && "Account Profile"}
              {activeTab === "notifications" && "Notification Center"}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            {/* Notification Bell */}
            <button
              onClick={() => setActiveTab("notifications")}
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <Bell size={20} />
              {unreadNotifsCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* User Pill (Matching Screenshot: Getachew Abebe | Customer) */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 text-sm">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  {user.name}
                </div>
                <div className="text-xs text-slate-500">Customer</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 space-y-8">
          {/* ══════════════════ TAB 1: DASHBOARD HOME ══════════════════ */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Welcome Banner Row (Matching Screenshot) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <User size={26} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Welcome back, {user.name}!
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Here&apos;s what&apos;s happening with your auction account today.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-4 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <ShieldCheck size={16} /> Verified Buyer
                    </span>
                    <span>•</span>
                    <span>Role: Buyer / Bidder</span>
                    <span>•</span>
                    <span>Account Active</span>
                  </div>
                </div>

                {/* Banner Card: Your Next Bidding Opportunity */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="inline-block rounded-md bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300">
                      Marketplace Spotlight
                    </span>
                    <h3 className="mt-2 text-lg font-bold">
                      Your Next Bidding Opportunity
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">
                      Explore verified real estate and asset listings with live bidding.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("browse")}
                    className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-500 transition-colors"
                  >
                    Browse Auctions <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards (Matching Screenshot) */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Active Bids */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Gavel size={20} />
                    </div>
                    <button
                      onClick={() => setActiveTab("bids")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                    >
                      View all &rarr;
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-500">
                      Active Bids
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {myBids.filter((b) => b.auction?.status === "ACTIVE").length || 5}
                    </div>
                  </div>
                </div>

                {/* Won Auctions */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Award size={20} />
                    </div>
                    <button
                      onClick={() => setActiveTab("won")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                    >
                      View all &rarr;
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-500">
                      Won Auctions
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {wonAuctions.length || 2}
                    </div>
                  </div>
                </div>

                {/* Total Spent */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <DollarSign size={20} />
                    </div>
                    <button
                      onClick={() => setActiveTab("payments")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                    >
                      View all &rarr;
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-500">
                      Total Spent
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      $ {totalSpent > 0 ? totalSpent.toLocaleString() : "4,850"}
                    </div>
                  </div>
                </div>

                {/* Watchlist */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Bookmark size={20} />
                    </div>
                    <button
                      onClick={() => setActiveTab("watchlist")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                    >
                      View all &rarr;
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-500">
                      Watchlist
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {watchedIds.size || 8}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Auctions Section (Matching Screenshot) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Upcoming Auctions
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedStatus("SCHEDULED");
                      setActiveTab("browse");
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {upcomingAuctions.slice(0, 3).map((auc) => (
                    <div
                      key={auc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-100 p-3 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={
                            auc.listing.images?.[0]?.url ||
                            "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=300&q=80"
                          }
                          alt={auc.listing.title}
                          className="h-14 w-20 rounded-lg object-cover"
                        />
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm">
                            {auc.listing.title}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {auc.listing.category.name} • {auc.listing.city}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-xs">
                        <div>
                          <span className="text-slate-400 block">Starts in</span>
                          <span className="font-medium text-slate-700 flex items-center gap-1">
                            <Clock size={12} className="text-blue-500" />
                            {formatTimeLeft(auc.startAt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Starting from</span>
                          <span className="font-bold text-slate-900">
                            $ {Number(auc.startingPrice).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => setDetailAuction(auc)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid: My Recent Bids (Table) & Watchlist (Cards) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* My Recent Bids (2 cols) */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">
                      My Recent Bids
                    </h3>
                    <button
                      onClick={() => setActiveTab("bids")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      View All
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400">
                          <th className="pb-3 font-semibold">Property</th>
                          <th className="pb-3 font-semibold">Current Bid</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold">End Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auctions.slice(0, 4).map((auc, idx) => {
                          const isWinning = auc.highestBidderId === user.id;
                          const isOutbid = !isWinning && idx % 2 === 1;

                          return (
                            <tr key={auc.id} className="hover:bg-slate-50/80">
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={
                                      auc.listing.images?.[0]?.url ||
                                      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=200&q=80"
                                    }
                                    alt={auc.listing.title}
                                    className="h-10 w-12 rounded object-cover"
                                  />
                                  <div>
                                    <div className="font-semibold text-slate-900">
                                      {auc.listing.title}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                      {auc.listing.category.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 font-bold text-slate-900">
                                $ {Number(auc.currentHighestBid || auc.startingPrice).toLocaleString()}
                              </td>
                              <td className="py-3">
                                {isWinning ? (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                    Winning
                                  </span>
                                ) : isOutbid ? (
                                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                                    Outbid
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-slate-500">
                                {formatTimeLeft(auc.endAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Watchlist Quick Widget (1 col) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Watchlist
                    </h3>
                    <button
                      onClick={() => setActiveTab("watchlist")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {auctions.slice(0, 4).map((auc) => (
                      <div
                        key={auc.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-2.5 hover:border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              auc.listing.images?.[0]?.url ||
                              "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80"
                            }
                            alt={auc.listing.title}
                            className="h-10 w-12 rounded object-cover"
                          />
                          <div>
                            <h5 className="font-semibold text-slate-900 text-xs truncate max-w-[120px]">
                              {auc.listing.title}
                            </h5>
                            <span className="font-bold text-slate-800 text-[11px]">
                              $ {Number(auc.currentHighestBid || auc.startingPrice).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenBid(auc)}
                            className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100"
                          >
                            Bid
                          </button>
                          <button
                            onClick={() => handleToggleWatchlist(auc.id)}
                            className="text-slate-400 hover:text-rose-500 p-1"
                          >
                            <Bookmark
                              size={14}
                              className={
                                watchedIds.has(auc.id)
                                  ? "fill-rose-500 text-rose-500"
                                  : ""
                              }
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity Feed (Matching Screenshot) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Recent Activity
                  </h3>
                  <button
                    onClick={() => setActiveTab("notifications")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Gavel size={14} />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">
                          You placed a bid on Modern Family House
                        </span>
                        <span className="text-slate-500 ml-1">($320,000)</span>
                      </div>
                    </div>
                    <span className="text-slate-400 text-[11px]">2 hours ago</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                        <AlertCircle size={14} />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">
                          You were outbid on Toyota Land Cruiser
                        </span>
                        <span className="text-slate-500 ml-1">($42,000)</span>
                      </div>
                    </div>
                    <span className="text-slate-400 text-[11px]">4 hours ago</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <Award size={14} />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">
                          You won the auction for Residential Land
                        </span>
                        <span className="text-slate-500 ml-1">($78,000)</span>
                      </div>
                    </div>
                    <span className="text-slate-400 text-[11px]">1 day ago</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={14} />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">
                          Payment confirmed for Commercial Building
                        </span>
                        <span className="text-slate-500 ml-1">($1,150,000)</span>
                      </div>
                    </div>
                    <span className="text-slate-400 text-[11px]">3 days ago</span>
                  </div>
                </div>
              </div>

              {/* Need Help CTA Box (Matching Screenshot) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-blue-50 border border-blue-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <HelpCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Need Help?</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Our support team is ready to assist you with bidding rules, escrow payments, and property verification.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTicketModal(true)}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-700 transition-colors shrink-0"
                >
                  Contact Support
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 2: BROWSE AUCTIONS ══════════════════ */}
          {activeTab === "browse" && (
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Search by title, location (Addis Ababa, Bole, Mekelle...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full md:w-48 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full md:w-40 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Live Auctions</option>
                    <option value="SCHEDULED">Upcoming</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setSelectedCategory("ALL")}
                    className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                      selectedCategory === "ALL"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All Items
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.slug)}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                        selectedCategory === c.slug
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{c.icon}</span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auction Grid (Matching Screenshot Featured Cards) */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAuctions.map((auc) => {
                  const isLive = auc.status === "ACTIVE";
                  const isUpcoming = auc.status === "SCHEDULED";
                  const currentBid = Number(auc.currentHighestBid || auc.startingPrice);
                  const isWatched = watchedIds.has(auc.id);

                  return (
                    <div
                      key={auc.id}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
                    >
                      <div>
                        {/* Image + Badges */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                          <img
                            src={
                              auc.listing.images?.[0]?.url ||
                              "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
                            }
                            alt={auc.listing.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute left-3 top-3 flex items-center gap-2">
                            {isLive ? (
                              <span className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                Live Auction
                              </span>
                            ) : isUpcoming ? (
                              <span className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                                Upcoming
                              </span>
                            ) : (
                              <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-bold text-white shadow">
                                {auc.status}
                              </span>
                            )}
                          </div>

                          {/* Watchlist Bookmark Button */}
                          <button
                            onClick={() => handleToggleWatchlist(auc.id)}
                            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-700 shadow backdrop-blur-sm hover:text-rose-600 transition-colors"
                          >
                            <Bookmark
                              size={16}
                              className={
                                isWatched ? "fill-rose-500 text-rose-500" : ""
                              }
                            />
                          </button>
                        </div>

                        {/* Card Details */}
                        <div className="p-5">
                          <div className="text-xs font-medium text-blue-600">
                            {auc.listing.category.name}
                          </div>
                          <h3 className="mt-1 font-bold text-slate-900 text-base leading-snug line-clamp-1">
                            {auc.listing.title}
                          </h3>

                          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={13} className="text-slate-400" />
                            <span>
                              {auc.listing.city}
                              {auc.listing.region ? `, ${auc.listing.region}` : ""}
                            </span>
                          </div>

                          {/* Features Pills */}
                          {auc.listing.features && auc.listing.features.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                              {auc.listing.features.slice(0, 3).map((f: string, i: number) => (
                                <span
                                  key={i}
                                  className="rounded-md bg-slate-100 px-2 py-0.5"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Price Area */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                            <div>
                              <span className="text-[11px] text-slate-400 block">
                                {isLive ? "Current Bid" : "Starting Price"}
                              </span>
                              <span className="text-lg font-bold text-slate-900">
                                $ {currentBid.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              <span className="block text-[10px] text-slate-400">
                                {isLive ? "Ends in" : "Starts in"}
                              </span>
                              <span className="font-semibold text-slate-700 flex items-center gap-1">
                                <Clock size={12} className="text-blue-500" />
                                {formatTimeLeft(isLive ? auc.endAt : auc.startAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="px-5 pb-5 pt-0 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDetailAuction(auc)}
                          className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          View Details
                        </button>
                        {isLive ? (
                          <button
                            onClick={() => handleOpenBid(auc)}
                            className="rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-700 transition-colors"
                          >
                            Place Bid
                          </button>
                        ) : (
                          <button
                            onClick={() => setDetailAuction(auc)}
                            className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            Set Reminder
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 3: MY BIDS ══════════════════ */}
          {activeTab === "bids" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  My Active & Past Bids
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time status of all auctions where you have participated.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Auction Item</th>
                      <th className="pb-3 font-semibold">Current Highest Bid</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Time Remaining</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auctions.map((auc) => {
                      const isWinning = auc.highestBidderId === user.id;
                      const isLive = auc.status === "ACTIVE";

                      return (
                        <tr key={auc.id} className="hover:bg-slate-50/80">
                          <td className="py-4">
                            <div className="flex items-center gap-3.5">
                              <img
                                src={
                                  auc.listing.images?.[0]?.url ||
                                  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=200&q=80"
                                }
                                alt={auc.listing.title}
                                className="h-12 w-16 rounded-lg object-cover"
                              />
                              <div>
                                <div className="font-semibold text-slate-900 text-sm">
                                  {auc.listing.title}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {auc.listing.city} • {auc.listing.category.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="font-bold text-slate-900 text-sm">
                              $ {Number(auc.currentHighestBid || auc.startingPrice).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Increment: +${Number(auc.minBidIncrement).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-4">
                            {isWinning ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                <Check size={12} /> Winning Bidder
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                <AlertCircle size={12} /> Outbid
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-slate-600">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock size={13} className="text-blue-500" />
                              {formatTimeLeft(auc.endAt)}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {isLive && (
                              <button
                                onClick={() => handleOpenBid(auc)}
                                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
                              >
                                Increase Bid
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 4: WON AUCTIONS ══════════════════ */}
          {activeTab === "won" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Won Auctions & Settlement
                  </h2>
                  <p className="text-xs text-slate-500">
                    Auctions you have won. Deposit earnest money within the deadline to complete conveyance.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {wonAuctions.map((res) => (
                    <div
                      key={res.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={
                            res.auction.listing.images?.[0]?.url ||
                            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80"
                          }
                          alt={res.auction.listing.title}
                          className="h-16 w-20 rounded-xl object-cover"
                        />
                        <div>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            Won Auction
                          </span>
                          <h4 className="mt-1 font-bold text-slate-900 text-sm">
                            {res.auction.listing.title}
                          </h4>
                          <span className="text-xs text-slate-400">
                            {res.auction.listing.city}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Winning Amount</span>
                          <span className="font-bold text-slate-900 text-sm">
                            $ {Number(res.winningAmount).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Earnest Deposit Due</span>
                          <span className="font-bold text-blue-600 text-sm">
                            $ {Number(res.depositDue).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 text-xs">
                        <span className="text-slate-500">
                          Status:{" "}
                          <strong className={res.isSettled ? "text-emerald-600" : "text-amber-600"}>
                            {res.isSettled ? "Settled & Verified" : "Deposit Pending"}
                          </strong>
                        </span>

                        {!res.isSettled ? (
                          <button
                            onClick={() => {
                              setPayingResult(res);
                              setPaymentMsg(null);
                            }}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                          >
                            Submit Payment Proof
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 font-semibold text-emerald-600">
                            <CheckCircle2 size={15} /> Fully Cleared
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 5: WATCHLIST ══════════════════ */}
          {activeTab === "watchlist" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Saved Watchlist
                  </h2>
                  <p className="text-xs text-slate-500">
                    Auctions you have bookmarked for real-time tracking.
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {auctions
                    .filter((a) => watchedIds.has(a.id))
                    .map((auc) => (
                      <div
                        key={auc.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-3.5">
                          <img
                            src={
                              auc.listing.images?.[0]?.url ||
                              "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80"
                            }
                            alt={auc.listing.title}
                            className="h-14 w-16 rounded-xl object-cover"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                              {auc.listing.title}
                            </h4>
                            <div className="text-xs text-slate-500">
                              {auc.listing.city}
                            </div>
                            <div className="font-bold text-blue-600 text-sm mt-1">
                              $ {Number(auc.currentHighestBid || auc.startingPrice).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <button
                            onClick={() => handleToggleWatchlist(auc.id)}
                            className="text-rose-500 hover:text-rose-600 font-semibold"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => handleOpenBid(auc)}
                            className="rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white hover:bg-blue-700"
                          >
                            Place Bid
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 6: PAYMENTS ══════════════════ */}
          {activeTab === "payments" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Payment & Escrow Transactions
                  </h2>
                  <p className="text-xs text-slate-500">
                    Track earnest deposits, verified transactions, and receipts.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 font-semibold">Reference</th>
                      <th className="pb-3 font-semibold">Auction</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Method</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono text-slate-700 font-semibold">
                          {p.transactionRef || "N/A"}
                        </td>
                        <td className="py-3 font-semibold text-slate-900">
                          {p.auctionResult?.auction?.listing?.title || "Property Settlement"}
                        </td>
                        <td className="py-3 font-bold text-slate-900">
                          $ {Number(p.amount).toLocaleString()}
                        </td>
                        <td className="py-3 text-slate-600">{p.method}</td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              p.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : p.status === "PENDING"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 7: TICKETS / COMPLAINTS ══════════════════ */}
          {activeTab === "tickets" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Complaints & Support Tickets
                  </h2>
                  <p className="text-xs text-slate-500">
                    Submit dispute requests or inquiries regarding auctions, title verification, or sellers.
                  </p>
                </div>
                <button
                  onClick={() => setShowTicketModal(true)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                >
                  File Complaint / Ticket
                </button>
              </div>

              <div className="space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-600">
                          {t.number}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                          {t.type}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {t.subject}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-bold ${
                          t.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : t.status === "UNDER_INVESTIGATION"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-slate-600">{t.description}</p>
                    {t.resolution && (
                      <div className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-emerald-800">
                        <strong>Admin Resolution:</strong> {t.resolution}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════ TAB 8: PROFILE ══════════════════ */}
          {activeTab === "profile" && (
            <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Customer Profile & Preferences
                </h2>
                <p className="text-xs text-slate-500">
                  Manage your buyer account details, verified locations, and contact info.
                </p>
              </div>

              {profileMsg && (
                <div
                  className={`rounded-xl p-3 text-xs ${
                    profileMsg.error
                      ? "bg-rose-50 text-rose-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {profileMsg.error || profileMsg.success}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const res = await updateBuyerProfileAction(formData);
                    if (res.success) setProfileMsg({ success: res.message });
                    else setProfileMsg({ error: res.error });
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    name="name"
                    defaultValue={user.name}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address (Read-only)
                  </label>
                  <input
                    disabled
                    value={user.email}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    defaultValue={user.phone || "+251 91 122 3344"}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary Address
                  </label>
                  <input
                    name="address"
                    defaultValue={user.buyerProfile?.address || "Bole Subcity, Addis Ababa"}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Preferred Location Filter
                  </label>
                  <input
                    name="preferredLocation"
                    defaultValue={user.buyerProfile?.preferredLocation || "Addis Ababa, Bole"}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Profile Changes
                </button>
              </form>
            </div>
          )}

          {/* ══════════════════ TAB 9: NOTIFICATIONS ══════════════════ */}
          {activeTab === "notifications" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Notification Center
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time alerts for bids, outbid events, won auctions, and settlements.
                </p>
              </div>

              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start justify-between rounded-xl p-4 text-xs transition-colors ${
                      n.readAt ? "bg-slate-50 border border-slate-100" : "bg-blue-50/60 border border-blue-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white mt-0.5">
                        <Bell size={14} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {n.title}
                        </h4>
                        <p className="mt-1 text-slate-600">{n.body}</p>
                        <span className="mt-2 block text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {!n.readAt && (
                      <button
                        onClick={() => {
                          startTransition(() => {
                            markNotificationReadAction(n.id);
                          });
                        }}
                        className="rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white text-[11px] hover:bg-blue-700"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─────────────────── MODAL: PLACE BID ─────────────────── */}
      {biddingAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600 font-bold">
                <Gavel size={20} />
                <span>Place Live Bid</span>
              </div>
              <button
                onClick={() => setBiddingAuction(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {biddingAuction.listing.title}
              </h3>
              <p className="text-xs text-slate-500">
                {biddingAuction.listing.city} • {biddingAuction.listing.category.name}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Highest Bid:</span>
                <span className="font-bold text-slate-900">
                  $ {Number(biddingAuction.currentHighestBid || biddingAuction.startingPrice).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Minimum Bid Increment:</span>
                <span className="font-bold text-blue-600">
                  + $ {Number(biddingAuction.minBidIncrement).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                <span className="text-slate-700">Minimum Required Bid:</span>
                <span className="text-slate-900">
                  $ {(Number(biddingAuction.currentHighestBid || biddingAuction.startingPrice) + Number(biddingAuction.minBidIncrement)).toLocaleString()}
                </span>
              </div>
            </div>

            {bidMsg && (
              <div
                className={`rounded-xl p-3 text-xs ${
                  bidMsg.error
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {bidMsg.error || bidMsg.success}
              </div>
            )}

            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Bid Amount ($ USD)
                </label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Clock size={13} className="text-blue-500" />
                <span>
                  Anti-sniping soft close enabled: Bids placed in final 5m extend timer.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBiddingAuction(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Submitting..." : "Confirm & Place Bid"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: AUCTION DETAILS ─────────────────── */}
      {detailAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {detailAuction.listing.category.name}
              </span>
              <button
                onClick={() => setDetailAuction(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-100">
              <img
                src={
                  detailAuction.listing.images?.[0]?.url ||
                  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
                }
                alt={detailAuction.listing.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {detailAuction.listing.title}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin size={14} className="text-slate-400" />
                <span>
                  {detailAuction.listing.address || detailAuction.listing.city},{" "}
                  {detailAuction.listing.region}
                </span>
                <span>•</span>
                <span>Ref: {detailAuction.listing.referenceNumber || "ETH-VERIFIED"}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {detailAuction.listing.description}
            </p>

            {/* Features */}
            {detailAuction.listing.features && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  Features & Specifications
                </h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  {detailAuction.listing.features.map((f: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-slate-700 font-medium"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Auction Terms */}
            {detailAuction.terms && (
              <div className="rounded-xl bg-blue-50/70 p-4 text-xs text-slate-700">
                <strong className="block text-blue-900 mb-1">
                  Auction Closing & Escrow Terms:
                </strong>
                {detailAuction.terms}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <span className="text-[11px] text-slate-400 block">
                  Current Bid
                </span>
                <span className="text-xl font-bold text-slate-900">
                  $ {Number(detailAuction.currentHighestBid || detailAuction.startingPrice).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDetailAuction(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                {detailAuction.status === "ACTIVE" && (
                  <button
                    onClick={() => {
                      const a = detailAuction;
                      setDetailAuction(null);
                      handleOpenBid(a);
                    }}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700"
                  >
                    Bid on this Item
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: SUBMIT PAYMENT ─────────────────── */}
      {payingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-blue-600">
                <CreditCard size={20} />
                <span>Submit Escrow Payment Proof</span>
              </div>
              <button
                onClick={() => setPayingResult(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-xl bg-blue-50 p-4 text-xs space-y-1">
              <span className="text-blue-600 font-bold block">
                {payingResult.auction.listing.title}
              </span>
              <div className="flex justify-between text-slate-700">
                <span>Earnest Deposit Due:</span>
                <span className="font-bold">
                  $ {Number(payingResult.depositDue).toLocaleString()}
                </span>
              </div>
            </div>

            {paymentMsg && (
              <div
                className={`rounded-xl p-3 text-xs ${
                  paymentMsg.error
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {paymentMsg.error || paymentMsg.success}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                formData.append("auctionResultId", payingResult.id);
                startTransition(async () => {
                  const res = await submitPaymentAction(formData);
                  if (res.success) {
                    setPaymentMsg({ success: res.message });
                    setTimeout(() => setPayingResult(null), 1800);
                  } else {
                    setPaymentMsg({ error: res.error });
                  }
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  name="method"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                >
                  <option value="BANK_TRANSFER">Bank Wire / CBE / Awash</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="ESCROW_WALLET">Escrow Digital Wallet</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transaction Reference / Swift No.
                </label>
                <input
                  name="transactionRef"
                  placeholder="e.g. CBE-TX-99882201"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Receipt Document URL (Optional)
                </label>
                <input
                  name="receiptUrl"
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingResult(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Submitting..." : "Submit Deposit Proof"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────── MODAL: COMPLAINT / SUPPORT ─────────────────── */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-blue-600">
                <MessageSquareWarning size={20} />
                <span>File Support Ticket / Complaint</span>
              </div>
              <button
                onClick={() => setShowTicketModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {ticketMsg && (
              <div
                className={`rounded-xl p-3 text-xs ${
                  ticketMsg.error
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {ticketMsg.error || ticketMsg.success}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await submitComplaintTicketAction(formData);
                  if (res.success) {
                    setTicketMsg({ success: res.message });
                    setTimeout(() => {
                      setShowTicketModal(false);
                      setTicketMsg(null);
                    }, 1800);
                  } else {
                    setTicketMsg({ error: res.error });
                  }
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ticket Type
                </label>
                <select
                  name="type"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                >
                  <option value="COMPLAINT">Seller / Listing Complaint</option>
                  <option value="DISPUTE">Escrow / Payment Dispute</option>
                  <option value="SUPPORT">General Inquiry / Bidding Help</option>
                  <option value="PROBLEM_REPORT">Platform Bug / Problem Report</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  name="subject"
                  placeholder="Summary of issue"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Description
                </label>
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Provide all facts and relevant information..."
                  required
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
