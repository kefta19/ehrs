"use client";

import { useState } from "react";
import Link from "next/link";
import { ETHomeLogo } from "./ethome-brand";
import { ThemeToggle } from "./theme-toggle";
import { Search, ChevronRight, Menu, X } from "lucide-react";

export function HomeHeader({
  user,
  dashboardHref,
}: {
  user: { id: string; name?: string; role: string } | null;
  dashboardHref?: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-18">
        {/* Brand Logo */}
        <ETHomeLogo size="md" href="/" />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="/" className="text-blue-600 dark:text-blue-400 font-semibold transition-colors">
            Home
          </Link>
          <Link href="/buyer?tab=browse" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Browse
          </Link>
          <Link href="/buyer?tab=browse" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Auctions
          </Link>
          <a href="#about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            About
          </a>
          <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Contact
          </a>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Background & Theme Color Toggle */}
          <ThemeToggle />

          <Link
            href="/buyer?tab=browse"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Search auctions"
          >
            <Search size={18} />
          </Link>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href={dashboardHref || "/dashboard"}
                className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] px-4 py-4 space-y-3 shadow-xl transition-colors">
          <nav className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40"
            >
              Home
            </Link>
            <Link
              href="/buyer?tab=browse"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Browse Properties & Assets
            </Link>
            <Link
              href="/buyer?tab=browse"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Live Auctions
            </Link>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              About Platform
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Contact Support
            </a>
          </nav>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {user ? (
              <Link
                href={dashboardHref || "/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs"
              >
                Go to Dashboard
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
