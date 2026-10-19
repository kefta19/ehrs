"use client";

import { useState, useTransition } from "react";
import { confirmAccountEmailChangeAction } from "@/app/actions/account";

export function VerifyAccountEmail({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Account security</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Confirm your new email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Confirm that you control this address to make it the email used for your account.
        </p>
        {feedback && (
          <p
            role="status"
            className={`mt-5 rounded-xl p-3 text-sm ${feedback.error ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"}`}
          >
            {feedback.error ?? feedback.success}
          </p>
        )}
        {!feedback?.success && (
          <button
            type="button"
            disabled={isPending || !token}
            onClick={() => {
              startTransition(async () => {
                const result = await confirmAccountEmailChangeAction(token);
                setFeedback(
                  result.success
                    ? { success: result.message }
                    : { error: result.error },
                );
              });
            }}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Verifying…" : "Confirm email address"}
          </button>
        )}
        <a
          href="/login"
          className="mt-6 block text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
        >
          Return to sign in
        </a>
      </section>
    </main>
  );
}
