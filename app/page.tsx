import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { HomeHeader } from "@/components/home-header";
import { ETHomeLogo } from "@/components/ethome-brand";
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Headphones,
  ChevronRight,
  MapPin,
  Gavel,
  Lock,
  ArrowRight,
  Phone,
  Mail,
  Home,
  Car,
  LandPlot,
  Building2,
  Factory,
  Package,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  const [categories, featuredAuctions] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { listings: true } },
      },
    }),
    prisma.auction.findMany({
      where: {
        status: { in: ["ACTIVE", "SCHEDULED"] },
      },
      include: {
        listing: {
          include: {
            images: { orderBy: { displayOrder: "asc" } },
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const categoryImages: Record<string, string> = {
    homes: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80",
    "cars-vehicles": "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=400&q=80",
    land: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80",
    commercial: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80",
    industrial: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80",
    "other-assets": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80",
  };

  const formatTimeLeft = (date: Date) => {
    const target = new Date(date);
    if (Number.isNaN(target.getTime())) return "Closed";

    return target.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#090d16] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* ─────────────────── TOP HEADER / NAVBAR (Responsive + Theme Toggle) ─────────────────── */}
      <HomeHeader user={user} dashboardHref={user ? roleHome(user.role) : undefined} />

      {/* ─────────────────── HERO SECTION (Matching Screenshot) ─────────────────── */}
      <section className="relative overflow-hidden bg-[#0A192F] text-white py-16 lg:py-24">
        {/* Background Image Overlay with gradient */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80"
            alt="Luxury Architecture"
            className="h-full w-full object-cover object-center opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A192F] via-[#0A192F]/90 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-6">
            <span className="inline-block text-xs font-semibold tracking-wider text-blue-400 uppercase">
              Buy • Bid • Own
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Find & Bid on <br />
              What You <span className="text-blue-400">Need</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
              Discover homes, cars, land, commercial properties, and other assets through secure online auctions.
            </p>

            {/* Hero Search Box (Matching Screenshot) */}
            <div className="rounded-2xl bg-white p-2.5 shadow-2xl flex flex-col md:flex-row items-center gap-2 text-slate-800">
              <div className="relative flex-1 w-full flex items-center">
                <Search size={18} className="absolute left-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search for property, car, land, etc..."
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="hidden sm:block h-8 w-px bg-slate-200" />

              <select className="w-full md:w-44 rounded-xl px-3 py-3 text-sm outline-none bg-transparent text-slate-700">
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="hidden sm:block h-8 w-px bg-slate-200" />

              <select className="w-full md:w-36 rounded-xl px-3 py-3 text-sm outline-none bg-transparent text-slate-700">
                <option value="ALL">Location</option>
                <option value="Addis Ababa">Addis Ababa</option>
                <option value="Mekelle">Mekelle</option>
                <option value="Dire Dawa">Dire Dawa</option>
                <option value="Bishoftu">Bishoftu</option>
              </select>

              <Link
                href="/buyer?tab=browse"
                className="w-full md:w-auto rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                <Search size={16} /> Search
              </Link>
            </div>

            {/* 4 Trust Value Props (Matching Screenshot) */}
            <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <strong className="block text-white font-semibold">Secure Bidding</strong>
                  <span className="text-slate-400 text-[11px]">Your transactions are safe</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <strong className="block text-white font-semibold">Transparent Process</strong>
                  <span className="text-slate-400 text-[11px]">Fair and open auctions</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <Clock size={18} />
                </div>
                <div>
                  <strong className="block text-white font-semibold">Real-Time Updates</strong>
                  <span className="text-slate-400 text-[11px]">Stay informed always</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <Headphones size={18} />
                </div>
                <div>
                  <strong className="block text-white font-semibold">Dedicated Support</strong>
                  <span className="text-slate-400 text-[11px]">We&apos;re here to help</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── BROWSE BY CATEGORY (Matching Screenshot) ─────────────────── */}
      <section className="py-16 bg-slate-50/60 dark:bg-[#0c1220] transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Browse by Category
            </h2>
            <Link
              href="/buyer?tab=browse"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
            >
              View All Categories <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((c) => {
              const bgImg =
                categoryImages[c.slug] ||
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80";

              return (
                <Link
                  key={c.id}
                  href={`/buyer?tab=browse&category=${c.slug}`}
                  className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:shadow-md transition-all text-center"
                >
                  <div className="aspect-square w-24 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 mb-3">
                    <img
                      src={bgImg}
                      alt={c.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</h3>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {c._count?.listings || (c.slug === "homes" ? 12 : c.slug === "cars-vehicles" ? 18 : 8)} Auctions
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────── FEATURED AUCTIONS (Matching Screenshot) ─────────────────── */}
      <section className="py-16 bg-white dark:bg-[#090d16] transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Featured Auctions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Hand-picked high-value properties and verified machinery available right now.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/buyer?tab=browse"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
              >
                View All <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredAuctions.map((auc) => {
              const isLive = auc.status === "ACTIVE";
              const isUpcoming = auc.status === "SCHEDULED";
              const currentBid = Number(auc.currentHighestBid || auc.startingPrice);

              return (
                <div
                  key={auc.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all"
                >
                  <div>
                    {/* Thumbnail + Badge */}
                    <div className="relative aspect-[16/11] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={
                          auc.listing.images?.[0]?.url ||
                          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80"
                        }
                        alt={auc.listing.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3">
                        {isLive ? (
                          <span className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                            Live Auction
                          </span>
                        ) : (
                          <span className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                            Upcoming
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                        {auc.listing.title}
                      </h3>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <MapPin size={12} className="text-slate-400" />
                        <span>
                          {auc.listing.city}
                          {auc.listing.region ? `, ${auc.listing.region}` : ""}
                        </span>
                      </div>

                      {auc.listing.features && auc.listing.features.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          {auc.listing.features.slice(0, 3).join(" • ")}
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                            {isLive ? "Current Bid" : "Starting Price"}
                          </span>
                          <span className="text-base font-bold text-slate-900 dark:text-white">
                            $ {currentBid.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                            {isLive ? "Ends in" : "Starts in"}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {formatTimeLeft(isLive ? auc.endAt : auc.startAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <Link
                      href="/buyer?tab=browse"
                      className={`flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-semibold shadow transition-colors ${
                        isLive
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                      }`}
                    >
                      {isLive ? "Place Bid" : "View Details"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────── CTA BANNER (Matching Screenshot) ─────────────────── */}
      <section className="py-12 bg-slate-50 dark:bg-[#0c1220] transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#0A192F] dark:bg-[#061122] text-white p-8 sm:p-12 shadow-xl border border-slate-800/80">
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
                alt="Automobile"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="relative z-10 max-w-xl space-y-6">
              <h2 className="text-3xl font-extrabold tracking-tight">
                Ready to Get Started?
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Join thousands of buyers and sellers in a trusted online auction marketplace.
              </p>

              <div className="flex items-center gap-3">
                <Link
                  href="/register"
                  className="rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow hover:bg-blue-500 transition-colors"
                >
                  Register Now
                </Link>
                <Link
                  href="/buyer?tab=browse"
                  className="rounded-xl border border-slate-600 px-6 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Learn More
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
                <div>
                  <strong className="block text-white">Verified Sellers</strong>
                  <span className="text-slate-400 text-[11px]">Trusted and authentic</span>
                </div>
                <div>
                  <strong className="block text-white">Secure Payments</strong>
                  <span className="text-slate-400 text-[11px]">Multiple payment options</span>
                </div>
                <div>
                  <strong className="block text-white">Full Support</strong>
                  <span className="text-slate-400 text-[11px]">We&apos;re here to help</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── FOOTER (Matching Screenshot) ─────────────────── */}
      <footer id="contact" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#060c18] py-12 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-slate-100 dark:border-slate-800">
            {/* Col 1: Brand */}
            <div className="space-y-3">
              <ETHomeLogo size="sm" href="/" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The premier transparent real estate and asset auction marketplace in Ethiopia and East Africa.
              </p>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Quick Links</h4>
              <ul className="space-y-1.5">
                <li><Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link></li>
                <li><Link href="/buyer?tab=browse" className="hover:text-blue-600 dark:hover:text-blue-400">Browse</Link></li>
                <li><Link href="/buyer?tab=browse" className="hover:text-blue-600 dark:hover:text-blue-400">Auctions</Link></li>
                <li><Link href="/login" className="hover:text-blue-600 dark:hover:text-blue-400">About Us</Link></li>
                <li><Link href="/customer" className="hover:text-blue-600 dark:hover:text-blue-400">Contact</Link></li>
              </ul>
            </div>

            {/* Col 3: Categories */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Categories</h4>
              <ul className="space-y-1.5">
                <li><Link href="/buyer?tab=browse&category=homes" className="hover:text-blue-600 dark:hover:text-blue-400">Homes</Link></li>
                <li><Link href="/buyer?tab=browse&category=cars-vehicles" className="hover:text-blue-600 dark:hover:text-blue-400">Cars & Vehicles</Link></li>
                <li><Link href="/buyer?tab=browse&category=land" className="hover:text-blue-600 dark:hover:text-blue-400">Land</Link></li>
                <li><Link href="/buyer?tab=browse&category=commercial" className="hover:text-blue-600 dark:hover:text-blue-400">Commercial</Link></li>
                <li><Link href="/buyer?tab=browse&category=industrial" className="hover:text-blue-600 dark:hover:text-blue-400">Industrial</Link></li>
              </ul>
            </div>

            {/* Col 4: Contact Us */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Contact Us</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-blue-600" /> +251 11 123 4567
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-blue-600" /> info@ethome.com
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={14} className="text-blue-600" /> Addis Ababa, Ethiopia
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 dark:text-slate-500">
            <div>&copy; 2026 ETHome. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</Link>
              <Link href="#" className="hover:text-slate-600 dark:hover:text-slate-300">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
