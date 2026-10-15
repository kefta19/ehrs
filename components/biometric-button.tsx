"use client";

import { useState } from "react";
import { CheckCircle2, Fingerprint } from "lucide-react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(json?.error ?? json?.message ?? "Request failed");
  return json;
}

export function BiometricButton({
  verificationId,
  onVerified,
  disabled,
}: {
  verificationId: string | null;
  onVerified: (id: string) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(forceRegister = false) {
    setError(null);
    setBusy(true);
    try {
      if (!browserSupportsWebAuthn())
        throw new Error(
          "This browser or device does not support fingerprint verification.",
        );
      const { mode, options } = await post("/api/biometric/options", {
        forceRegister,
      });
      const response =
        mode === "register"
          ? await startRegistration({ optionsJSON: options })
          : await startAuthentication({ optionsJSON: options });
      const result = await post("/api/biometric/verify", { mode, response });
      onVerified(result.verificationId);
    } catch (e) {
      const err = e as Error;
      setError(
        err.name === "NotAllowedError"
          ? "The fingerprint prompt was cancelled or timed out. Try again."
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => run(false)}
        disabled={busy || disabled}
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
          verificationId
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
        }`}
      >
        {verificationId ? (
          <CheckCircle2 size={18} />
        ) : (
          <Fingerprint size={18} />
        )}
        {busy
          ? "Waiting for your device…"
          : verificationId
            ? "Fingerprint verified (tap to redo)"
            : "Verify with fingerprint"}
      </button>
      {!verificationId && (
        <button
          type="button"
          onClick={() => run(true)}
          disabled={busy || disabled}
          className="block text-[11px] text-slate-500 underline hover:text-slate-700 disabled:opacity-50"
        >
          Using a new phone or computer? Register this device
        </button>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
