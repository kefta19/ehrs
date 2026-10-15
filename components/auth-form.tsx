"use client";

import { useBranding } from "./branding-provider";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ETHomeLogo } from "./ethome-brand";
import { User, Shield, Building2, ArrowRight } from "lucide-react";
import { AnimatedInput } from "./animated-input";

type Mode = "login" | "register";

export function AuthForm({ mode = "login", redirectUrl }: { mode?: Mode; redirectUrl?: string }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "BUYER",
    businessName: "",
  });
  //inside componnent change the useBranding to get the companyName

  const { companyName } = useBranding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  async function handleLoginWith(email: string, pass: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setLoading(false);
        return;
      }
      window.location.href = data.redirectTo ?? "/dashboard";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload =
      mode === "login"
        ? { email: form.email, password: form.password }
        : {
            name: form.name,
            email: form.email,
            password: form.password,
            phone: form.phone,
            role: form.role,
            businessName:
              form.role === "SELLER" ? form.businessName : undefined,
          };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        const first =
          data.details && typeof data.details === "object"
            ? (Object.values(data.details).flat()[0] as string | undefined)
            : undefined;
        setError(first ?? data.error ?? "Request failed");
        setLoading(false);
        return;
      }
      window.location.href = data.redirectTo ?? redirectUrl ?? "/dashboard";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^\+?[1-9]\d{1,14}$/;

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-blue-50/30 p-8 shadow-xl"
      >
        {mode === "register" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">1</div>
                <span className="text-sm font-semibold text-slate-700">Account Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500 font-bold text-sm">2</div>
                <span className="text-sm font-semibold text-slate-400">KYC Verification</span>
              </div>
            </div>
            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-blue-600 rounded-full transition-all duration-500"></div>
            </div>
          </div>
        )}

        <div className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <ETHomeLogo size="md" href="/" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {mode === "login"
              ? `Sign in to ${companyName}`
              : "Create your account"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {mode === "login"
              ? "Access your live auctions, bid progression, and escrow payments."
              : "Register as a buyer to bid or a seller to list property auctions."}
          </p>
        </div>

        {mode === "register" && (
          <>
            <label className="block text-xs font-semibold text-slate-700">
              I want to participate as
              <select
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className={inputClass}
              >
                <option value="BUYER">
                  Customer / Buyer (Place bids on properties & assets)
                </option>
                <option value="SELLER">
                  Seller / Auction Owner (List items and host auctions)
                </option>
              </select>
            </label>

            <AnimatedInput
              label="Full Name"
              placeholder="Getachew Abebe"
              value={form.name}
              onChange={(v) => set("name", v)}
              required
              minLength={2}
              maxLength={100}
            />

            {form.role === "SELLER" && (
              <AnimatedInput
                label="Business / Company Name (Optional)"
                placeholder="Prime Real Estate LLC"
                value={form.businessName}
                onChange={(v) => set("businessName", v)}
                maxLength={100}
              />
            )}

            <AnimatedInput
              label="Phone Number"
              placeholder="+251 91 122 3344"
              value={form.phone}
              onChange={(v) => set("phone", v)}
              required
              pattern={phonePattern}
              validate={(v) => {
                if (!v.startsWith("+")) {
                  return { valid: false, message: "Include country code (e.g., +251)" };
                }
                return { valid: true };
              }}
            />
          </>
        )}

        <AnimatedInput
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(v) => set("email", v)}
          required
          pattern={emailPattern}
        />

        <AnimatedInput
          label="Password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={(v) => set("password", v)}
          required
          minLength={8}
          maxLength={128}
          validate={(v) => {
            if (mode === "register") {
              const hasUpper = /[A-Z]/.test(v);
              const hasLower = /[a-z]/.test(v);
              const hasNumber = /[0-9]/.test(v);
              if (!hasUpper || !hasLower || !hasNumber) {
                return {
                  valid: false,
                  message: "Must include uppercase, lowercase, and a number",
                };
              }
            }
            return { valid: true };
          }}
        />

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign In"
              : "Create Account"}
        </button>

        <p className="text-center text-xs text-slate-500 pt-2">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-blue-600 hover:underline"
              >
                Register here
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:underline"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </form>

      {/* Quick Demo Access Pills for 3 Roles */}
      {mode === "login" && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-xs space-y-3">
          <span className="font-bold text-slate-700 block text-center text-[11px] uppercase tracking-wider">
            Quick One-Click Demo Role Logins
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                handleLoginWith("buyer@propertyauction.et", "Buyer@1234")
              }
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-blue-400 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <User size={14} />
                </div>
                <div>
                  <strong className="block text-slate-800 text-[11px]">
                    Buyer
                  </strong>
                  <span className="text-[10px] text-slate-400">Getachew</span>
                </div>
              </div>
              <ArrowRight size={12} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() =>
                handleLoginWith("seller@propertyauction.et", "Seller@1234")
              }
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-blue-400 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Building2 size={14} />
                </div>
                <div>
                  <strong className="block text-slate-800 text-[11px]">
                    Seller
                  </strong>
                  <span className="text-[10px] text-slate-400">Dawit</span>
                </div>
              </div>
              <ArrowRight size={12} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() =>
                handleLoginWith("admin@propertyauction.et", "Admin@1234")
              }
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:border-blue-400 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Shield size={14} />
                </div>
                <div>
                  <strong className="block text-slate-800 text-[11px]">
                    Admin
                  </strong>
                  <span className="text-[10px] text-slate-400">Executive</span>
                </div>
              </div>
              <ArrowRight size={12} className="text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
