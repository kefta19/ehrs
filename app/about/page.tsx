import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  Gavel,
  Handshake,
  Search,
  ShieldCheck,
  Store,
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

const steps = [
  {
    number: "01",
    icon: FileCheck2,
    title: "Listings are reviewed",
    description:
      "Sellers submit an asset and its supporting information. The platform reviews submissions before approved listings are published.",
  },
  {
    number: "02",
    icon: Search,
    title: "Explore the marketplace",
    description:
      "Browse available properties and assets, review each listing, and check its auction schedule and participation requirements.",
  },
  {
    number: "03",
    icon: Gavel,
    title: "Participate in an auction",
    description:
      "Sign in to view participation steps and place bids on active auctions. Any registration or entry-fee requirements are shown for the auction.",
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
        title: "Get ready to bid",
        description:
          "Check the auction details for registration and entrance-fee requirements. Complete any required registration or payment before bidding is enabled.",
      },
      {
        title: "Place and follow your bids",
        description:
          "When an auction is live, submit a bid that meets the displayed minimum. Save auctions to your Watchlist and check My Bids and Notifications for updates.",
      },
      {
        title: "Manage the outcome",
        description:
          "Review Won Auctions and Payment Records in your dashboard for any next steps. Use Complaints & Support to submit a question or dispute.",
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
          "Add the asset category, description, location, at least three photos, a valid social video post link, your ID document, and fingerprint verification. Include ownership documents when available.",
      },
      {
        title: "Set up the auction",
        description:
          "After creating the listing, continue through the auction setup to enter the starting price and schedule. Review the entry-fee instructions and submit the auction for administrator review.",
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
                From submission to auction participation
              </h2>
              <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
                Clear steps help sellers prepare listings and buyers know
                where to find the information they need.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {steps.map(({ number, icon: Icon, title, description }) => (
                <article
                  key={number}
                  className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold tracking-widest text-blue-600 dark:text-blue-400">
                      {number}
                    </span>
                    <Icon size={22} className="text-slate-400" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {description}
                  </p>
                </article>
              ))}
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
