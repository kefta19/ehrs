"use client";

import Image from "next/image";
import { ShieldCheck, Building2 } from "lucide-react";

export function AuthImagePanel({
  mode = "login",
}: {
  mode?: "login" | "register";
}) {
  return (
    <div className="relative hidden lg:flex h-full w-full flex-col justify-center overflow-hidden bg-slate-950 p-10 xl:p-14 text-white select-none">
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

      <div className="relative z-10" />

      {/* Bottom Content / Highlights */}
      <div className="relative z-10 max-w-lg space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight leading-tight text-white drop-shadow-sm">
            {mode === "login"
              ? "Bid with Confidence. Win with Trust."
              : "Join Ethiopia's Trusted Auction Marketplace"}
          </h2>
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
