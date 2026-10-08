"use client";

import React from "react";
import { LogOut } from "lucide-react";

export function LogoutButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      onClick={logout}
      className={
        className ||
        "flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
      }
    >
      <LogOut size={16} />
      {children || <span>Sign Out</span>}
    </button>
  );
}
