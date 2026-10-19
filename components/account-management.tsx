"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";

import {
  changeAccountPasswordAction,
  requestAccountEmailChangeAction,
  updateAccountProfileAction,
} from "@/app/actions/account";

type AccountManagementProps = {
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isGoogleOnly: boolean;
};

type Feedback = { error?: string; success?: string } | null;

export function AccountManagement({
  name,
  email,
  phone,
  avatarUrl,
  isGoogleOnly,
}: AccountManagementProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);
  const [photoFeedback, setPhotoFeedback] = useState<Feedback>(null);
  const [photoUrl, setPhotoUrl] = useState(avatarUrl ?? "");

  const submitProfile = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateAccountProfileAction(formData);
      setProfileFeedback(
        result.success ? { success: result.message } : { error: result.error },
      );
      if (result.success) router.refresh();
    });
  };

  const submitPassword = (formData: FormData) => {
    startTransition(async () => {
      const result = await changeAccountPasswordAction(formData);
      setPasswordFeedback(
        result.success ? { success: result.message } : { error: result.error },
      );
      if (result.success) {
        const form = document.getElementById("account-password-form");
        if (form instanceof HTMLFormElement) form.reset();
      }
    });
  };

  const submitEmail = (formData: FormData) => {
    startTransition(async () => {
      const result = await requestAccountEmailChangeAction(formData);
      setEmailFeedback(
        result.success ? { success: result.message } : { error: result.error },
      );
      if (result.success) {
        const form = document.getElementById("account-email-form");
        if (form instanceof HTMLFormElement) form.reset();
      }
    });
  };

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoFeedback(null);
    if (file.size > 5 * 1024 * 1024) {
      setPhotoFeedback({ error: "Choose an image that is 5 MB or smaller." });
      return;
    }

    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
        message?: string;
      };
      if (!response.ok || !result.url) {
        setPhotoFeedback({
          error: result.error ?? result.message ?? "The profile photo could not be uploaded.",
        });
        return;
      }
      setPhotoUrl(result.url);
      setPhotoFeedback({ success: "Profile photo updated." });
      router.refresh();
    } catch {
      setPhotoFeedback({ error: "The profile photo could not be uploaded. Please try again." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <UserRound size={19} />
          </span>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Profile details</h2>
            <p className="text-xs text-slate-500">Update the name and phone number shown on your account.</p>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xl font-bold text-slate-500 dark:bg-slate-800">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt="Profile photo"
                width={64}
                height={64}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => void uploadPhoto(event.currentTarget.files?.[0])}
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Camera size={14} />
              Change photo
            </button>
            <p className="mt-1 text-[11px] text-slate-500">JPG, PNG, or WebP; up to 5 MB.</p>
            {photoFeedback && <FeedbackMessage feedback={photoFeedback} />}
          </div>
        </div>

        <form action={submitProfile} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Full name
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={name}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Phone number
            <input
              name="phone"
              maxLength={30}
              defaultValue={phone ?? ""}
              autoComplete="tel"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <div className="sm:col-span-2">
            <FeedbackMessage feedback={profileFeedback} />
            <button
              type="submit"
              disabled={isPending}
              className="mt-3 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <KeyRound size={18} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Password</h2>
              <p className="text-xs text-slate-500">Confirm your current password before setting a new one.</p>
            </div>
          </div>
          {isGoogleOnly ? (
            <div className="rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
              This account uses Google sign-in. Change your password in your{" "}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
              >
                Google Account security settings
              </a>
              .
            </div>
          ) : (
            <form
              id="account-password-form"
              action={submitPassword}
              className="space-y-3"
            >
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Current password"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="New password (at least 8 characters)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <FeedbackMessage feedback={passwordFeedback} />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700"
              >
                Update password
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-xl bg-violet-50 p-2.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <Mail size={18} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Email address</h2>
              <p className="text-xs text-slate-500">Your email is used to sign in and receive account messages.</p>
            </div>
          </div>
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Current address</p>
              <p className="break-all text-slate-600 dark:text-slate-400">{email}</p>
            </div>
          </div>
          {isGoogleOnly ? (
            <p className="rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
              This account uses Google sign-in. Manage its email address in your{" "}
              <a
                href="https://myaccount.google.com/personal-info"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
              >
                Google Account settings
              </a>
              .
            </p>
          ) : (
            <form id="account-email-form" action={submitEmail} className="space-y-3">
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="New email address"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Confirm current password"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <FeedbackMessage feedback={emailFeedback} />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Send verification link
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      role="status"
      className={`mt-2 text-xs ${feedback.error ? "text-rose-600" : "text-emerald-700"}`}
    >
      {feedback.error ?? feedback.success}
    </p>
  );
}
