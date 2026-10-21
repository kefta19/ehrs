"use client";

import { useBranding } from "./branding-provider";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ETHomeLogo } from "./ethome-brand";
import { AnimatedInput } from "./animated-input";

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
    if (mode === "register") params.set("role", form.role);
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
      // Immediate redirect for faster perceived performance
      window.location.href = data.redirectTo ?? redirectUrl ?? "/dashboard";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 placeholder:text-slate-400 dark:placeholder:text-slate-500";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^\+?[1-9]\d{1,14}$/;

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-950 p-8 shadow-xl text-slate-800 dark:text-slate-100 transition-colors"
      >
        {mode === "register" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">1</div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Account Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm">2</div>
                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">KYC Verification</span>
              </div>
            </div>
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-blue-600 rounded-full transition-all duration-500"></div>
            </div>
          </div>
        )}

        <div className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <ETHomeLogo size="md" href="/" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === "login"
              ? `Sign in to ${companyName}`
              : "Create your account"}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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

        <div className="space-y-4">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            <span className="mx-3 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Or continue with
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
          </div>
          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 48 48"
              className="h-[18px] w-[18px]"
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
            {loading ? "Connecting to Google..." : "Continue with Google"}
          </button>
          {mode === "login" && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Forgot your Google Account password?{" "}
              <a
                href="https://accounts.google.com/signin/recovery"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Recover it with Google
              </a>
            </p>
          )}
        </div>

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

    </div>
  );
}
