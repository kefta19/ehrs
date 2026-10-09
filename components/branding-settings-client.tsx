"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Gavel,
  Loader2,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";
import {
  contrastRatio,
  isHexColor,
  type Branding,
} from "@/lib/branding-shared";

type Kind = "logo" | "favicon";
const COLOR_KEYS = [
  "primaryColor",
  "secondaryColor",
  "backgroundColor",
  "textColor",
] as const;
const COLOR_LABELS: Record<(typeof COLOR_KEYS)[number], string> = {
  primaryColor: "Primary color",
  secondaryColor: "Secondary color",
  backgroundColor: "Background color",
  textColor: "Text color",
};
const RULES: Record<Kind, { max: number; types: string[]; hint: string }> = {
  logo: {
    max: 2 * 1024 * 1024,
    types: ["image/png", "image/jpeg", "image/webp"],
    hint: "PNG, JPG or WebP, up to 2 MB",
  },
  favicon: {
    max: 256 * 1024,
    types: ["image/png", "image/x-icon", "image/vnd.microsoft.icon"],
    hint: "PNG or ICO, up to 256 KB",
  },
};

type FormState = {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
};
const pickForm = (b: Branding): FormState => ({
  companyName: b.companyName,
  primaryColor: b.primaryColor,
  secondaryColor: b.secondaryColor,
  backgroundColor: b.backgroundColor,
  textColor: b.textColor,
});

function uploadFile(kind: Kind, file: File, onProgress: (pct: number) => void) {
  return new Promise<Branding>((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/branding/upload/${kind}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { success?: boolean; branding?: Branding; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (
        xhr.status >= 200 &&
        xhr.status < 300 &&
        data.success &&
        data.branding
      )
        resolve(data.branding);
      else reject(new Error(data.error ?? "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error. Please try again."));
    xhr.send(fd);
  });
}

export function BrandingSettingsClient({ initial }: { initial: Branding }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(pickForm(initial));
  const [saved, setSaved] = useState<FormState>(pickForm(initial));
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState(initial.faviconUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [uploading, setUploading] = useState<{
    kind: Kind;
    pct: number;
  } | null>(null);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function applyServer(b: Branding) {
    const f = pickForm(b);
    setForm(f);
    setSaved(f);
    setLogoUrl(b.logoUrl);
    setFaviconUrl(b.faviconUrl);
  }

  function validate() {
    const e: Record<string, string> = {};
    const name = form.companyName.trim();
    if (name.length < 2)
      e.companyName = "Company name must be at least 2 characters";
    else if (name.length > 80) e.companyName = "Company name is too long";
    else if (/[<>]/.test(name))
      e.companyName = "Company name cannot contain < or >";
    for (const k of COLOR_KEYS)
      if (!isHexColor(form[k]))
        e[k] = "Use a 6-digit HEX color such as #2563EB";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function call(method: "PUT" | "DELETE") {
    const res = await fetch("/api/branding", {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "PUT" ? JSON.stringify(form) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.details && typeof data.details === "object") {
        setErrors(
          Object.fromEntries(
            Object.entries(data.details as Record<string, string[]>).map(
              ([k, v]) => [k, v[0]],
            ),
          ),
        );
      }
      throw new Error(data.error ?? "Request failed");
    }
    return data.branding as Branding;
  }

  async function save() {
    if (!validate()) return;
    setBusy("save");
    setToast(null);
    try {
      applyServer(await call("PUT"));
      setErrors({});
      setToast({ type: "ok", text: "Branding saved." });
      router.refresh();
    } catch (err) {
      setToast({ type: "err", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setConfirmReset(false);
    setBusy("reset");
    setToast(null);
    try {
      applyServer(await call("DELETE"));
      setErrors({});
      setToast({ type: "ok", text: "Branding reset to defaults." });
      router.refresh();
    } catch (err) {
      setToast({ type: "err", text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function onFile(kind: Kind, file: File | undefined) {
    if (!file) return;
    const rule = RULES[kind];
    if (!rule.types.includes(file.type))
      return setToast({
        type: "err",
        text: `Unsupported file type. ${rule.hint}.`,
      });
    if (file.size > rule.max)
      return setToast({
        type: "err",
        text: `File is too large. ${rule.hint}.`,
      });
    setToast(null);
    setUploading({ kind, pct: 0 });
    try {
      const b = await uploadFile(kind, file, (pct) =>
        setUploading({ kind, pct }),
      );
      if (kind === "logo") setLogoUrl(b.logoUrl);
      else setFaviconUrl(b.faviconUrl);
      setToast({
        type: "ok",
        text: `${kind === "logo" ? "Logo" : "Favicon"} updated.`,
      });
      router.refresh();
    } catch (err) {
      setToast({ type: "err", text: (err as Error).message });
    } finally {
      setUploading(null);
    }
  }

  const lowPrimaryContrast =
    isHexColor(form.primaryColor) &&
    contrastRatio(form.primaryColor, "#FFFFFF") < 3;
  const lowTextContrast =
    isHexColor(form.textColor) &&
    isHexColor(form.backgroundColor) &&
    contrastRatio(form.textColor, form.backgroundColor) < 4.5;
  const disabled = busy !== null || uploading !== null;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            ← Back to admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Marketplace Branding
          </h1>
          <p className="text-sm opacity-70">
            Customize how your marketplace looks. Changes affect only your
            organization.
          </p>
        </div>
      </div>

      <div role="status" aria-live="polite">
        {toast && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl border p-3 text-xs ${
              toast.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {toast.type === "ok" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {toast.text}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ───── Controls ───── */}
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
          <div>
            <label
              htmlFor="companyName"
              className="block text-xs font-semibold text-slate-700"
            >
              Company / marketplace name
            </label>
            <input
              id="companyName"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              maxLength={80}
              aria-invalid={!!errors.companyName}
              aria-describedby={
                errors.companyName ? "companyName-err" : undefined
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            {errors.companyName && (
              <p
                id="companyName-err"
                className="mt-1 text-[11px] text-rose-600"
              >
                {errors.companyName}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Uploader
              label="Logo"
              kind="logo"
              url={logoUrl}
              uploading={uploading}
              disabled={disabled}
              onFile={onFile}
            />
            <Uploader
              label="Favicon"
              kind="favicon"
              url={faviconUrl}
              uploading={uploading}
              disabled={disabled}
              onFile={onFile}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {COLOR_KEYS.map((k) => (
              <ColorField
                key={k}
                id={k}
                label={COLOR_LABELS[k]}
                value={form[k]}
                error={errors[k]}
                onChange={(v) => set(k, v)}
              />
            ))}
          </div>

          {(lowPrimaryContrast || lowTextContrast) && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {lowPrimaryContrast &&
                "White text on your primary color may be hard to read. "}
              {lowTextContrast &&
                "Your text color has low contrast against the background."}
            </p>
          )}

          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={save}
              disabled={disabled || !dirty}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === "save" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {busy === "save" ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === "reset" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RotateCcw size={16} />
              )}
              Reset to Default
            </button>
          </div>
        </div>

        {/* ───── Live preview ───── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider opacity-70">
            Live preview
          </h2>
          <Preview form={form} logoUrl={logoUrl} />
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            aria-describedby="reset-desc"
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-800 shadow-xl"
          >
            <h3 id="reset-title" className="text-lg font-bold">
              Reset branding?
            </h3>
            <p id="reset-desc" className="mt-2 text-sm text-slate-600">
              This restores the default name and colors and permanently deletes
              your uploaded logo and favicon.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                autoFocus
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
              >
                Yes, reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={`${id}-hex`}
        className="block text-xs font-semibold text-slate-700"
      >
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={isHexColor(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
        />
        <input
          id={`${id}-hex`}
          value={value}
          maxLength={7}
          spellCheck={false}
          onChange={(e) =>
            onChange(
              e.target.value.startsWith("#")
                ? e.target.value
                : `#${e.target.value}`,
            )
          }
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1 text-[11px] text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function Uploader({
  label,
  kind,
  url,
  uploading,
  disabled,
  onFile,
}: {
  label: string;
  kind: Kind;
  url: string | null;
  uploading: { kind: Kind; pct: number } | null;
  disabled: boolean;
  onFile: (kind: Kind, file: File | undefined) => void;
}) {
  const active = uploading?.kind === kind;
  return (
    <div>
      <span className="block text-xs font-semibold text-slate-700">
        {label}
      </span>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={`${label} preview`}
              className="h-full w-full object-contain"
            />
          ) : (
            <Gavel size={20} className="text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${disabled ? "pointer-events-none opacity-50" : ""}`}
          >
            {active ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {active
              ? `Uploading ${uploading.pct}%`
              : url
                ? `Replace ${label.toLowerCase()}`
                : `Upload ${label.toLowerCase()}`}
            <input
              type="file"
              className="sr-only"
              accept={RULES[kind].types.join(",")}
              disabled={disabled}
              onChange={(e) => {
                onFile(kind, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <p className="mt-1 text-[11px] text-slate-400">{RULES[kind].hint}</p>
          {active && (
            <div
              className="mt-1 h-1 w-full overflow-hidden rounded bg-slate-100"
              role="progressbar"
              aria-valuenow={uploading.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${uploading.pct}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Preview({
  form,
  logoUrl,
}: {
  form: FormState;
  logoUrl: string | null;
}) {
  const ok = (v: string, fb: string) => (isHexColor(v) ? v : fb);
  const primary = ok(form.primaryColor, "#2563EB");
  const secondary = ok(form.secondaryColor, "#0F172A");
  const bg = ok(form.backgroundColor, "#F8FAFC");
  const text = ok(form.textColor, "#1E293B");
  const name = form.companyName.trim() || "Your marketplace";

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
      style={{ backgroundColor: bg, color: text }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ backgroundColor: secondary, color: "#fff" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-8 w-8 rounded-lg object-contain"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: primary }}
            >
              <Gavel size={16} />
            </div>
          )}
          <span className="truncate text-sm font-bold">{name}</span>
        </div>
        <nav className="hidden items-center gap-4 text-xs sm:flex">
          <span style={{ color: primary, filter: "brightness(1.6)" }}>
            Auctions
          </span>
          <span className="opacity-80">Categories</span>
          <span className="opacity-80">Sell</span>
        </nav>
        <span
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
          style={{ backgroundColor: primary }}
        >
          Sign in
        </span>
      </div>

      <div className="flex">
        <aside
          className="hidden w-32 shrink-0 space-y-1 p-3 text-xs sm:block"
          style={{ backgroundColor: secondary, color: "#fff" }}
        >
          <div
            className="rounded-lg px-2.5 py-2 font-semibold text-white"
            style={{ backgroundColor: primary }}
          >
            Overview
          </div>
          <div className="px-2.5 py-2 opacity-70">My bids</div>
          <div className="px-2.5 py-2 opacity-70">Watchlist</div>
        </aside>

        <div className="flex-1 p-4">
          <div
            className="max-w-xs overflow-hidden rounded-xl border bg-white shadow-sm"
            style={{ borderColor: `${text}22`, color: text }}
          >
            <div className="h-24 bg-gradient-to-br from-slate-200 to-slate-300" />
            <div className="space-y-2 p-3">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: primary }}
              >
                LIVE
              </span>
              <div className="text-sm font-bold">Modern Family House</div>
              <div className="text-xs opacity-70">Current bid</div>
              <div className="text-lg font-bold" style={{ color: primary }}>
                $320,000
              </div>
              <button
                type="button"
                tabIndex={-1}
                className="w-full rounded-lg py-2 text-xs font-bold text-white"
                style={{ backgroundColor: primary }}
              >
                Place Bid
              </button>
              <div
                className="text-center text-[11px] font-semibold underline"
                style={{ color: primary }}
              >
                View details
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
