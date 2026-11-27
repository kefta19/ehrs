import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Check,
  CircleHelp,
  Clock3,
  ClipboardCheck,
  FileCheck2,
  Gavel,
  Handshake,
  Image as ImageIcon,
  ListChecks,
  Search,
  ShieldCheck,
  Store,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { HomeHeader } from "@/components/home-header";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn how ETHome connects buyers and sellers through reviewed listings and online auctions.",
};

const customerFlow = [
  {
    icon: UserRound,
    title: "Create a buyer account",
    description: "Register, sign in, and open your customer dashboard.",
  },
  {
    icon: Search,
    title: "Explore and review",
    description: "Browse listings and check photos, details, auction terms, and dates.",
  },
  {
    icon: ClipboardCheck,
    title: "Get bidding access",
    description: "Submit the auction entry fee and wait for its approval.",
  },
  {
    icon: Gavel,
    title: "Place or increase your bid",
    description:
      "After approval, your qualifying bid updates the live auction immediately. No separate bid-payment upload is needed.",
  },
  {
    icon: BadgeCheck,
    title: "Win and complete payment",
    description:
      "If your approved bid is highest and meets the reserve, you are notified and can submit the required deposit within 72 hours.",
  },
];

const sellerFlow = [
  {
    icon: UserRound,
    title: "Create a seller account",
    description: "Register as a seller and open your seller dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Complete seller verification",
    description: "Submit identity and business details for administrator review.",
  },
  {
    icon: ImageIcon,
    title: "Prepare your listing",
    description: "Add accurate details, photos, supporting documents, and requested verification.",
  },
  {
    icon: FileCheck2,
    title: "Submit for review",
    description: "Set up the auction and submit the listing and schedule for approval.",
  },
  {
    icon: TrendingUp,
    title: "Publish and follow results",
    description: "Once approved, monitor bids, notifications, auction close, and the winner in your dashboard.",
  },
];

const roleGuides = [
  {
    id: "buyer-guide",
    role: "Buyer",
    icon: UserRound,
    subtitle: "Discover assets and participate in auctions",
    description:
      "Use your buyer account to compare listings, follow auctions that interest you, and keep your bids and payments together in one dashboard.",
    steps: [
      {
        title: "Create a buyer account",
        description:
          "Register and choose Buyer. Sign in to open your buyer dashboard.",
      },
      {
        title: "Find the right listing",
        description:
          "Open Browse Properties, then search by title or location and filter by category or auction status. Open a listing to review its description, photos, public specifications, video, auction terms, price, and schedule. Seller identity and ownership documents are reviewed privately by the platform and are not shared with buyers.",
      },
      {
        title: "Pay the entry fee and wait for approval",
        description:
          "Submit the auction entry fee and payment evidence if required. Bidding is enabled after an administrator approves the fee.",
      },
      {
        title: "Place or increase your bid",
        description:
          "When the auction is live and your entry fee is approved, enter a bid that meets the displayed minimum. The bid updates the auction immediately; no separate bid-payment upload is needed. Follow activity in My Bids and Notifications.",
      },
      {
        title: "Follow the result and pay if you win",
        description:
          "The highest qualifying bid wins when the auction closes and meets the reserve price. If you win, check Won Auctions and Payments, then submit the required deposit within 72 hours.",
      },
    ],
    href: "/register",
    linkLabel: "Create a buyer account",
    secondaryHref: "/buyer?tab=browse",
    secondaryLabel: "Browse auctions",
    note: "Browsing is public. Signing in and completing any auction-specific requirements is needed to bid.",
  },
  {
    id: "seller-guide",
    role: "Seller",
    icon: Store,
    subtitle: "Verify your identity and bring an asset to auction",
    description:
      "The seller dashboard takes you from identity verification and listing preparation to auction scheduling and performance tracking.",
    steps: [
      {
        title: "Register as a seller",
        description:
          "Create an account and choose Seller. Sign in to open the seller dashboard and complete the Seller Verification (KYC) form.",
      },
      {
        title: "Submit verification details",
        description:
          "Provide your identification, address, and any requested business details. An administrator reviews your submission; publishing requires seller verification.",
      },
      {
        title: "Prepare a complete listing",
        description:
          "Add the asset category, description, location, at least three photos, a valid social video post link, and your ID document. Include ownership documents when available.",
      },
      {
        title: "Set up and submit the auction",
        description:
          "Enter the starting price and schedule, review any seller entry-fee instructions, and submit the listing and auction for administrator review.",
      },
      {
        title: "Track review and activity",
        description:
          "Use My Listings and Manage Auctions to follow statuses and address feedback. Once approved and live, monitor bids, winners, notifications, and reports from your dashboard.",
      },
    ],
    href: "/register",
    linkLabel: "Create a seller account",
    secondaryHref: "/seller",
    secondaryLabel: "Seller dashboard",
    note: "Listings and auctions are reviewed before they appear for bidding. Keep your supporting information accurate and up to date.",
  },
  {
    id: "admin-guide",
    role: "Administrator",
    icon: ShieldCheck,
    subtitle: "Review, moderate, and support the marketplace",
    description:
      "Administrators use the protected control center to manage marketplace activity and make sure submissions move through review.",
    steps: [
      {
        title: "Sign in with an administrator account",
        description:
          "Use your assigned account to open the Admin Control Center. Administrator access is managed by the platform; it is not a public self-registration role.",
      },
      {
        title: "Review seller verification",
        description:
          "Open Seller Verification to inspect KYC submissions and supporting details, then record an approval or rejection with clear feedback.",
      },
      {
        title: "Inspect listings and auction requests",
        description:
          "Check listing information, images, and ownership evidence in the approval queue. Review auction terms and schedules before approving publication.",
      },
      {
        title: "Monitor platform activity",
        description:
          "Use the live-bid and payment review areas to follow bidding activity and verify payment submissions. Moderate or suspend auctions when a review is required.",
      },
      {
        title: "Resolve issues and maintain oversight",
        description:
          "Manage user access, categories, settings, reports, and support tickets. Use the audit trail to review recorded administrative activity.",
      },
    ],
    href: "/login",
    linkLabel: "Administrator sign in",
    secondaryHref: "/login",
    secondaryLabel: "Open sign in",
    note: "Administrative tools and decisions should only be used by authorized staff.",
  },
];

const faqs = [
  {
    question: "How do I find auctions that are open for bidding?",
    answer:
      "Open Browse or Auctions from the navigation to see listings and their current status. Each auction page provides its schedule and details.",
  },
  {
    question: "Can I bid without an account?",
    answer:
      "You can browse public listings, but you need to sign in to participate. Some auctions may also require registration or an entry fee before bidding.",
  },
  {
    question: "How are listings reviewed?",
    answer:
      "Sellers submit listing information and supporting documents for review. Administrators review submissions and publish approved listings to the marketplace.",
  },
  {
    question: "Where can I get help with an account or auction?",
    answer:
      "Sign in and open your dashboard to access the support options available for your account. If you do not have an account yet, you can register to get started.",
  },
];

export default async function AboutPage() {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, icon: true },
    }),
  ]);
  const dashboardHref = user ? roleHome(user.role) : undefined;
  const helpHref = dashboardHref || "/login";

  return (
    <div className="min-h-screen bg-background text-slate-800 dark:text-slate-100">
      <HomeHeader
        user={user}
        dashboardHref={dashboardHref}
        activePage="about"
      />

      <main>
        <section className="relative overflow-hidden bg-[#0A192F] py-20 text-white sm:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/25 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
                About ETHome
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                A clearer way to buy and sell through auctions.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                ETHome brings property and asset listings, seller submissions,
                and online bidding together in one marketplace. Explore what is
                available and follow each auction from listing details to its
                scheduled close.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/buyer?tab=browse"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Explore listings <ArrowRight size={16} />
                </Link>
                <Link
                  href={user ? dashboardHref || "/dashboard" : "/register"}
                  className="inline-flex items-center justify-center rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {user ? "Open dashboard" : "Create an account"}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="mission"
          className="scroll-mt-24 py-16 sm:py-20"
        >
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                What we do
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Bringing buyers and sellers together with more clarity.
              </h2>
              <p className="mt-5 leading-7 text-slate-600 dark:text-slate-300">
                Our marketplace helps people discover homes, vehicles, land,
                commercial property, industrial assets, and more. Auction
                information is presented alongside each listing so visitors can
                understand what is being offered and how to take part.
              </p>
              <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
                Sellers can submit listings for review, while buyers can
                browse, follow auction schedules, and manage their activity
                after signing in.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <ShieldCheck className="text-blue-600 dark:text-blue-400" size={26} />
                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                  Review before publishing
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Submitted listings go through platform review before
                  approval and publication.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:translate-y-8">
                <Handshake className="text-blue-600 dark:text-blue-400" size={26} />
                <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                  One connected marketplace
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Browse listings, view auction details, and manage
                  participation from your account.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-24 bg-slate-50 py-16 dark:bg-[#0c1220] sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Two clear journeys. One trusted marketplace.
              </h2>
              <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
                Follow the visual walkthroughs below to see what buyers and
                sellers do at each stage, from account setup to auction close.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-6 text-white sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                        Customer journey
                      </p>
                      <h3 className="mt-2 text-2xl font-bold">
                        Discover. Bid. Win.
                      </h3>
                    </div>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <UserRound size={25} />
                    </span>
                  </div>

                  <div
                    role="img"
                    aria-label="Illustration of the customer dashboard showing a live auction and an increase bid action"
                    className="mt-6 overflow-hidden rounded-2xl border border-white/15 bg-slate-50 text-slate-800 shadow-xl"
                  >
                    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-3">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="ml-3 text-[10px] font-semibold tracking-wide text-slate-500">
                        CUSTOMER DASHBOARD / LIVE AUCTIONS
                      </span>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
                      <div className="flex gap-3">
                        <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-200 via-blue-300 to-slate-400 text-white">
                          <Store size={25} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                              LIVE
                            </span>
                            <span className="text-[9px] text-slate-500">
                              Residential property
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-bold">
                            Reviewed auction listing
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Photos · details · auction terms
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-blue-100 bg-white p-3 sm:min-w-40">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Current highest bid
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-slate-900">
                          9,200,000{" "}
                          <span className="text-[10px] font-medium text-slate-500">
                            ETB
                          </span>
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white">
                          <Gavel size={11} /> Increase bid
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-[10px] text-slate-600 sm:px-5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                        <Check size={11} /> Entry fee approved
                      </span>
                      <ArrowRight size={13} className="text-slate-400" />
                      <span className="font-semibold">
                        Bid updates immediately
                      </span>
                    </div>
                  </div>
                </div>

                <ol className="space-y-0 p-6 sm:p-8">
                  {customerFlow.map(({ icon: Icon, title, description }, index) => (
                    <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < customerFlow.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute left-4 top-9 h-[calc(100%-0.5rem)] w-px bg-blue-100 dark:bg-slate-700"
                        />
                      )}
                      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-4 ring-white dark:bg-blue-950 dark:text-blue-300 dark:ring-slate-900">
                        <Icon size={15} />
                      </span>
                      <div className="pt-0.5">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          <span className="mr-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {title}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                          {description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-col gap-3 border-t border-slate-100 p-6 pt-5 dark:border-slate-800 sm:flex-row">
                  <Link
                    href="/buyer?tab=browse"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Browse auctions <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Create buyer account
                  </Link>
                </div>
              </article>

              <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-950 p-6 text-white sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                        Seller journey
                      </p>
                      <h3 className="mt-2 text-2xl font-bold">
                        Verify. List. Sell.
                      </h3>
                    </div>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <Store size={25} />
                    </span>
                  </div>

                  <div
                    role="img"
                    aria-label="Illustration of the seller dashboard showing listing review and auction setup progress"
                    className="mt-6 overflow-hidden rounded-2xl border border-white/15 bg-slate-50 text-slate-800 shadow-xl"
                  >
                    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-3">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="ml-3 text-[10px] font-semibold tracking-wide text-slate-500">
                        SELLER DASHBOARD / LISTING REVIEW
                      </span>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                            <ListChecks size={17} />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              Listing submission
                            </p>
                            <p className="text-[9px] text-slate-500">
                              Complete each step before review
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2.5">
                          {[
                            "Seller verification",
                            "Listing details and photos",
                            "Auction schedule",
                          ].map((item, index) => (
                            <div
                              key={item}
                              className="flex items-center gap-2 text-[10px] text-slate-600"
                            >
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded-full ${
                                  index < 2
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {index < 2 ? <Check size={10} /> : <Clock3 size={9} />}
                              </span>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col justify-center rounded-xl border border-emerald-100 bg-white p-3 sm:min-w-36">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                          Review status
                        </p>
                        <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                          <Clock3 size={11} /> In review
                        </span>
                        <p className="mt-2 text-[9px] leading-4 text-slate-500">
                          Approved listings become available to buyers.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-[10px] text-slate-600 sm:px-5">
                      <ShieldCheck size={13} className="text-emerald-600" />
                      Administrator review before publication
                    </div>
                  </div>
                </div>

                <ol className="space-y-0 p-6 sm:p-8">
                  {sellerFlow.map(({ icon: Icon, title, description }, index) => (
                    <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < sellerFlow.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute left-4 top-9 h-[calc(100%-0.5rem)] w-px bg-emerald-100 dark:bg-slate-700"
                        />
                      )}
                      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-4 ring-white dark:bg-emerald-950 dark:text-emerald-300 dark:ring-slate-900">
                        <Icon size={15} />
                      </span>
                      <div className="pt-0.5">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          <span className="mr-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {title}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                          {description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-col gap-3 border-t border-slate-100 p-6 pt-5 dark:border-slate-800 sm:flex-row">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Start selling <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/seller"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Seller dashboard
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="roles"
          className="scroll-mt-24 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Your role, your workflow
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                A practical guide for every account
              </h2>
              <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
                Choose your role below to see where to start, what to expect,
                and which dashboard tools to use along the way.
              </p>
            </div>

            <nav
              aria-label="Role guides"
              className="mx-auto mt-8 flex max-w-fit flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900"
            >
              {roleGuides.map(({ id, role, icon: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-blue-700 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                >
                  <Icon size={16} />
                  {role}
                </a>
              ))}
            </nav>

            <div className="mt-10 space-y-6">
              {roleGuides.map(
                ({
                  id,
                  role,
                  icon: Icon,
                  subtitle,
                  description,
                  steps: roleSteps,
                  href,
                  linkLabel,
                  secondaryHref,
                  secondaryLabel,
                  note,
                }) => (
                  <article
                    key={id}
                    id={id}
                    className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
                      <div className="relative overflow-hidden bg-gradient-to-br from-[#0A192F] via-slate-900 to-blue-950 p-6 text-white sm:p-8 lg:p-10">
                        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl" />
                        <div className="relative">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-blue-200">
                            <Icon size={24} />
                          </span>
                          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
                            Role walkthrough
                          </p>
                          <h3 className="mt-2 text-3xl font-bold">{role}</h3>
                          <p className="mt-2 font-medium text-slate-200">
                            {subtitle}
                          </p>
                          <p className="mt-5 text-sm leading-6 text-slate-300">
                            {description}
                          </p>
                          <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                            <Link
                              href={href}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                            >
                              {linkLabel} <ArrowRight size={15} />
                            </Link>
                            <Link
                              href={secondaryHref}
                              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                            >
                              {secondaryLabel}
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 sm:p-8 lg:p-10">
                        <ol className="space-y-6">
                          {roleSteps.map((step, index) => (
                            <li
                              key={step.title}
                              className="relative flex gap-4"
                            >
                              {index < roleSteps.length - 1 && (
                                <span
                                  aria-hidden="true"
                                  className="absolute left-[15px] top-9 h-[calc(100%+0.5rem)] w-px bg-slate-200 dark:bg-slate-700"
                                />
                              )}
                              <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <div className="pt-0.5">
                                <h4 className="font-semibold text-slate-900 dark:text-white">
                                  {step.title}
                                </h4>
                                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                  {step.description}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>

                        <div className="mt-7 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-950 dark:border-blue-950 dark:bg-blue-950/30 dark:text-blue-100">
                          <ClipboardCheck
                            size={19}
                            className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300"
                          />
                          <p>{note}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          id="categories"
          className="scroll-mt-24 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Explore the marketplace
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Browse by category
                </h2>
              </div>
              <Link
                href="/buyer?tab=browse"
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Browse all listings <ArrowRight size={16} />
              </Link>
            </div>

            {categories.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/buyer?tab=browse&category=${encodeURIComponent(category.slug)}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {category.icon || "◇"}
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-slate-800 group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-300">
                      {category.name}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-8 rounded-2xl border border-slate-200 p-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                Categories are being prepared. You can still browse all
                available listings.
              </p>
            )}
          </div>
        </section>

        <section
          id="faq"
          className="scroll-mt-24 bg-slate-50 py-16 dark:bg-[#0c1220] sm:py-20"
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <CircleHelp className="mx-auto text-blue-600 dark:text-blue-400" size={28} />
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Frequently asked questions
              </h2>
            </div>
            <div className="mt-8 space-y-3">
              {faqs.map(({ question, answer }) => (
                <details
                  key={question}
                  className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 open:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:open:border-blue-900"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 marker:hidden dark:text-white">
                    {question}
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="pt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-5xl rounded-3xl bg-[#0A192F] p-8 text-white sm:p-12">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <BadgeCheck className="text-blue-300" size={28} />
                <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                  Ready to take your next step?
                </h2>
                <p className="mt-3 leading-7 text-slate-300">
                  Browse current opportunities, create an account to
                  participate, or sign in to find account support.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:min-w-48">
                <Link
                  href={helpHref}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  {user ? "Open dashboard" : "Sign in for support"}
                </Link>
                <Link
                  href="/buyer?tab=browse"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Browse listings <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#060c18] dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>ETHome — online property and asset auctions.</p>
          <nav aria-label="Footer navigation" className="flex gap-5">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
              Home
            </Link>
            <Link
              href="/buyer?tab=browse"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Browse
            </Link>
            <Link
              href={helpHref}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
