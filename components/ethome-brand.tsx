"use client";

import React from "react";
import Link from "next/link";
import { Gavel } from "lucide-react";
import { useBranding } from "./branding-provider";

export function ETHomeLogo({
  size = "md",
  dark = false,
  href = "/",
}: {
  size?: "sm" | "md" | "lg";
  dark?: boolean;
  href?: string;
}) {
  const { companyName, logoUrl } = useBranding();
  const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  const boxSize =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const titleSize =
    size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg";
  const subSize = size === "sm" ? "text-[10px]" : "text-xs";

  const content = (
    <div className="flex items-center gap-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`${companyName} logo`}
          className={`${boxSize} rounded-xl object-contain`}
        />
      ) : (
        <div
          className={`flex ${boxSize} items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20`}
        >
          <Gavel size={iconSize} className="stroke-[2.2]" />
        </div>
      )}
      <div className="flex flex-col leading-tight">
        <span
          className={`font-bold tracking-tight ${titleSize} ${dark ? "text-white" : "text-slate-900"}`}
        >
          {companyName}
        </span>
        <span
          className={`${subSize} ${dark ? "text-slate-400" : "text-slate-500"}`}
        >
          Online Auction Marketplace
        </span>
      </div>
    </div>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      className="inline-block transition-opacity hover:opacity-95"
    >
      {content}
    </Link>
  );
}
