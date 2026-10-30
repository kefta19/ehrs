"use client";

import { useBranding } from "./branding-provider";
import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  UserRound,
  Building2,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";
import { ETHomeLogo } from "./ethome-brand";

type Mode = "login" | "register";

const GOOGLE_AUTH_ERRORS: Record<string, string> = {
  google_not_configured:
    "Google sign-in is not configured yet. Ask the site administrator to set it up.",
  google_cancelled: "Google sign-in was cancelled.",
  google_unverified:
    "Google could not verify this email address. Try another account.",
  google_account_unavailable:
    "This account is unavailable. Please contact support.",
  google_registration_unavailable:
    "Registration is temporarily unavailable. Please try again later.",
  google_failed: "Google sign-in failed. Please try again.",
};

export function AuthForm({
  mode = "login",
  redirectUrl,
  googleError,
}: {
  mode?: Mode;
  redirectUrl?: string;
  googleError?: string;
}) {
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    businessName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { companyName } = useBranding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    googleError
      ? (GOOGLE_AUTH_ERRORS[googleError] ?? GOOGLE_AUTH_ERRORS.google_failed)
      : null,
  );

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function continueWithGoogle() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ mode });
    if (mode === "register") params.set("role", role);
    window.location.assign(
      new URL(
        `/api/auth/google/start?${params.toString()}`,
        window.location.origin,
      ).toString(),
    );
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
            role,
            businessName: role === "SELLER" ? form.businessName : undefined,
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
        setError(first ?? data.error ?? "Authentication failed");
        setLoading(false);
        return;
      }
      window.location.href = data.redirectTo ?? redirectUrl ?? "/dashboard";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 sm:p-6 shadow-2xl text-slate-800 dark:text-slate-100 transition-colors">
      {/* Brand Header */}
      <div className="text-center pb-1">
        <div className="flex justify-center mb-1.5">
          <ETHomeLogo size="sm" href="/" showTagline={false} />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {mode === "login"
            ? `Sign in to ${companyName}`
            : "Create your account"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {mode === "login"
            ? "Enter your credentials to access your dashboard"
            : "Select your role and enter your details to get started"}
        </p>
      </div>

      {/* Role-Based System Selector (Register only) */}
      {mode === "register" && (
        <div className="mt-2.5 mb-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Account Role
            </span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              {role === "BUYER" ? "Tenant / Buyer" : "Landlord / Owner"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            {/* Tenant / Buyer Tab */}
            <button
              type="button"
              onClick={() => setRole("BUYER")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                role === "BUYER"
                  ? "bg-white text-blue-700 shadow-sm border border-blue-200/80 dark:bg-blue-600 dark:text-white dark:border-blue-500"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <UserRound size={14} />
              <span>Tenant</span>
            </button>

            {/* Landlord / Seller Tab */}
            <button
              type="button"
              onClick={() => setRole("SELLER")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                role === "SELLER"
                  ? "bg-white text-blue-700 shadow-sm border border-blue-200/80 dark:bg-blue-600 dark:text-white dark:border-blue-500"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Building2 size={14} />
              <span>Landlord</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Form Fields */}
      <form onSubmit={onSubmit} className="space-y-2.5 sm:space-y-3">
        {mode === "register" ? (
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <UserRound
                    size={15}
                    className="absolute left-3 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Getachew Abebe"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Phone Number
                </label>
                <div className="relative flex items-center">
                  <Phone
                    size={15}
                    className="absolute left-3 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+251 91 122 3344"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition"
                  />
                </div>
              </div>
            </div>

            {/* Landlord-specific business name field */}
            {role === "SELLER" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Agency / Property Business Name (Optional)
                </label>
                <div className="relative flex items-center">
                  <Building2
                    size={15}
                    className="absolute left-3 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                    placeholder="Prime Real Estate LLC"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail
                    size={15}
                    className="absolute left-3 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock
                    size={15}
                    className="absolute left-3 text-slate-400 pointer-events-none"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-9 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Login Fields (Direct Email & Password - No Role Selector) */
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail
                  size={15}
                  className="absolute left-3 text-slate-400 pointer-events-none"
                />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock
                  size={15}
                  className="absolute left-3 text-slate-400 pointer-events-none"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-9 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 text-[11px]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember me</span>
              </label>

              <Link
                href="/about#contact"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* Primary Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign In"
              : "Create Account"}
        </button>

        {/* Google Registration / Sign-in placed UNDER other inputs */}
        <div>
          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative bg-white dark:bg-slate-900 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              or continue with
            </span>
          </div>

          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-750 transition disabled:cursor-wait disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 48 48"
              className="h-4 w-4 shrink-0"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.95 23.95 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.9-5.79l-7.62-5.91c-2.12 1.42-4.83 2.26-8.28 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
              />
            </svg>
            <span>
              {mode === "login"
                ? "Continue with Google"
                : `Register as ${role === "SELLER" ? "Landlord" : "Tenant"} with Google`}
            </span>
          </button>
        </div>

        {/* Footer Navigation Link */}
        <p className="pt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
              >
                Register here
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
