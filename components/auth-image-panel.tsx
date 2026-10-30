"use client";

import Image from "next/image";
import { ShieldCheck, Sparkles, Building2 } from "lucide-react";

export function AuthImagePanel({
  mode = "login",
}: {
  mode?: "login" | "register";
}) {
  return (
    <div className="relative hidden lg:flex h-full w-full flex-col justify-between overflow-hidden bg-slate-950 p-10 xl:p-14 text-white select-none">
      <Image
        src="/ethiopian-auction-hero.svg"
        alt="Illustration of an auction gavel against the Addis Ababa skyline and Ethiopian flag"
        fill
        priority
        className="object-cover object-center"
        sizes="50vw"
      />

      {/* Cinematic dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20" />

      {/* Top brand and security pills */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/20 shadow-sm">
          <Sparkles size={14} className="text-amber-400" />
          <span>Ethiopia&apos;s Online Auction Platform</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 backdrop-blur-md px-3 py-1.5 text-xs text-white border border-white/10">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span className="font-bold">Secure</span>
          <span className="text-white/60">bidding</span>
        </div>
      </div>

      {/* Bottom Content / Highlights */}
      <div className="relative z-10 max-w-lg space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight leading-tight text-white drop-shadow-sm">
            {mode === "login"
              ? "Bid with Confidence. Win with Trust."
              : "Join Ethiopia's Trusted Auction Marketplace"}
          </h2>
          <p className="text-sm xl:text-base text-white/85 leading-relaxed">
            {mode === "login"
              ? "Discover verified properties, vehicles, and more in transparent online auctions across Ethiopia."
              : "Register to explore verified listings and take part in secure auctions across Ethiopia."}
          </p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-md p-3 border border-white/15">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div className="text-xs">
              <div className="font-bold text-white">Verified Listings</div>
              <div className="text-[11px] text-white/70">Auctions you can trust</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-md p-3 border border-white/15">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <Building2 size={18} />
            </div>
            <div className="text-xs">
              <div className="font-bold text-white">Open Bidding</div>
              <div className="text-[11px] text-white/70">Fair and transparent</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
