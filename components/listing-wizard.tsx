"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Film,
  Gavel,
  HelpCircle,
  ImagePlus,
  Info,
  Lightbulb,
  PackagePlus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { BiometricButton } from "./biometric-button";
import { AnimatedInput } from "./animated-input";
import { createListingAction } from "@/app/actions/seller";
import { isSocialVideoPostUrl } from "@/lib/social-video-url";
import {
  createAuctionDraftAction,
  submitBankTransferAction,
  payEntryFeeWithChapaAction,
} from "@/app/actions/entry-fee";
import { MIN_LISTING_IMAGES } from "@/lib/listing-readiness";
import styles from "./listing-wizard.module.css";

type Cat = { id: string; name: string; slug?: string; icon?: string | null };
type Lst = { id: string; title: string; city?: string; status?: string };

const input =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-600 transition bg-white";
const label = "block font-semibold text-slate-700 mb-1 text-xs";
const MAX_IMG = 8 * 1024 * 1024;
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function computeDuration(startStr: string, endStr: string) {
  if (!startStr || !endStr) return null;
  const s = new Date(startStr).getTime();
  const e = new Date(endStr).getTime();
  if (isNaN(s) || isNaN(e)) return null;
  const diffMs = e - s;
  if (diffMs <= 0)
    return {
      valid: false,
      text: "End date must be after start date",
      days: 0,
      hours: 0,
    };
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let label = "";
  if (days > 0) label += `${days} Day${days > 1 ? "s" : ""}`;
  if (hours > 0)
    label += `${days > 0 ? ", " : ""}${hours} Hour${hours > 1 ? "s" : ""}`;
  if (days === 0 && hours === 0) label = `${mins} Minute${mins > 1 ? "s" : ""}`;

  const endH = new Date(endStr).getHours();
  const isEveningClosing = endH >= 17 && endH <= 21;

  return {
    valid: true,
    label,
    days,
    hours,
    isEveningClosing,
  };
}

function getCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("vehicle") || n.includes("car") || n.includes("auto"))
    return "🚗";
  if (
    n.includes("land") ||
    n.includes("plot") ||
    n.includes("farm") ||
    n.includes("agriculture")
  )
    return "🌾";
  if (
    n.includes("commercial") ||
    n.includes("office") ||
    n.includes("retail") ||
    n.includes("shop")
  )
    return "🏢";
  if (
    n.includes("industrial") ||
    n.includes("factory") ||
    n.includes("warehouse")
  )
    return "🏭";
  if (
    n.includes("residential") ||
    n.includes("house") ||
    n.includes("home") ||
    n.includes("villa") ||
    n.includes("apartment")
  )
    return "🏡";
  if (n.includes("machin") || n.includes("equipment")) return "🚜";
  if (n.includes("art") || n.includes("jewelry") || n.includes("luxury"))
    return "💎";
  return "📦";
}

async function upload(
  kind: "image" | "id" | "document",
  file: File,
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/upload/${kind}`, { method: "POST", body: fd });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.id)
    throw new Error(
      `${file.name}: ${json?.error ?? json?.message ?? "upload failed"}`,
    );
  return json.id as string;
}

export function ListingWizard({
  categories,
  listings,
  startStep = 1,
  initialListingId = null,
  onClose,
}: {
  categories: Cat[];
  listings: Lst[];
  startStep?: 1 | 2 | 3 | 4;
  initialListingId?: string | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(startStep);
  const [created, setCreated] = useState<Lst | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Category state for interactive picker
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || "",
  );

  // Schedule & Pricing state with intelligent defaults
  const [startAtValue, setStartAtValue] = useState(() => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
    return toDatetimeLocal(now);
  });
  const [endAtValue, setEndAtValue] = useState(() => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    end.setHours(18, 0, 0, 0); // 6:00 PM recommended closing
    return toDatetimeLocal(end);
  });
  const [startingPrice, setStartingPrice] = useState("");
  const [minBidIncrement, setMinBidIncrement] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [terms, setTerms] = useState("");
  const [showScheduleGuide, setShowScheduleGuide] = useState(false);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  // Entry fee state
  const [feeData, setFeeData] = useState<{
    id: string;
    amount: string;
    ratePercent: string;
    basisAmount: string;
    currency: string;
    auctionId: string;
  } | null>(null);
  const [bankRef, setBankRef] = useState("");
  const [transactionUrl, setTransactionUrl] = useState("");
  const [paymentTab, setPaymentTab] = useState<"bank" | "chapa">("bank");

  const steps = [
    {
      number: 1,
      title: "Property Details",
      description: "Information & documents",
    },
    {
      number: 2,
      title: "Auction Schedule",
      description: "Dates & pricing parameters",
    },
    {
      number: 3,
      title: "Pay Entry Fee",
      description: "Payment & verification",
    },
    { number: 4, title: "Under Review", description: "Admin inspection" },
  ];

  const [images, setImages] = useState<File[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [ownershipDoc, setOwnershipDoc] = useState<File | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  // Listing form state
  const [listingForm, setListingForm] = useState({
    title: "",
    city: "",
    region: "",
    address: "",
    referenceNumber: "",
    description: "",
    features: "",
    nationalIdNumber: "",
  });

  const previews = useMemo(
    () => images.map((f) => URL.createObjectURL(f)),
    [images],
  );
  useEffect(
    () => () => previews.forEach((u) => URL.revokeObjectURL(u)),
    [previews],
  );

  const options = [
    ...(created ? [created] : []),
    ...listings.filter(
      (l) =>
        l.id !== created?.id &&
        (l.status === "DRAFT" || l.status === "REJECTED"),
    ),
  ];

  function addImages(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    // Accept all image files - server will validate MIME type
    const ok = picked.filter(
      (f) => f.type.startsWith("image/") && f.size <= MAX_IMG,
    );
    setError(
      ok.length < picked.length
        ? "Some files were skipped. Use image files up to 8 MB."
        : null,
    );
    setImages((prev) => [...prev, ...ok].slice(0, 12));
  }

  function pickDoc(setter: (f: File | null) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null;
      e.target.value = "";
      if (!f) return;
      if (
        ![...IMG_TYPES, "application/pdf"].includes(f.type) ||
        f.size > MAX_IMG
      ) {
        setError("Documents must be JPEG, PNG, WebP or PDF up to 8 MB.");
        return;
      }
      setError(null);
      setter(f);
    };
  }

  async function submitListing(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (images.length < MIN_LISTING_IMAGES)
      return setError(
        `Add at least ${MIN_LISTING_IMAGES} photos (you have ${images.length}).`,
      );
    if (!isSocialVideoPostUrl(videoUrl))
      return setError(
        "Add a valid video post link from YouTube, TikTok, Instagram, Facebook, or X.",
      );
    if (!idDoc) return setError("Upload a photo or scan of your national ID.");
    if (!verificationId) return setError("Verify your fingerprint first.");

    // Get category from selected state or fallback form
    const form = e.currentTarget;
    const categoryId =
      selectedCategoryId ||
      (form.querySelector('[name="categoryId"]') as HTMLSelectElement)?.value ||
      categories[0]?.id;

    setError(null);
    setBusy(true);
    try {
      const imageIds: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${images.length}…`);
        imageIds.push(await upload("image", images[i]));
      }
      setProgress("Uploading national ID…");
      const idDocumentId = await upload("id", idDoc);
      let ownershipDocumentId = "";
      if (ownershipDoc) {
        setProgress("Uploading ownership document…");
        ownershipDocumentId = await upload("document", ownershipDoc);
      }

      setProgress("Saving listing…");
      const text = new FormData();
      text.set("categoryId", categoryId);
      text.set("title", listingForm.title);
      text.set("city", listingForm.city);
      text.set("region", listingForm.region);
      text.set("address", listingForm.address);
      text.set("referenceNumber", listingForm.referenceNumber);
      text.set("description", listingForm.description);
      text.set("features", listingForm.features);
      text.set("nationalIdNumber", listingForm.nationalIdNumber);
      text.set("imageIds", JSON.stringify(imageIds));
      text.set("videoUrl", videoUrl.trim());
      text.set("idDocumentId", idDocumentId);
      text.set("ownershipDocumentId", ownershipDocumentId);
      text.set("biometricVerificationId", verificationId);

      const res = await createListingAction(text);
      if (!res.success) {
        setVerificationId(null);
        setError(res.error);
        return;
      }
      setCreated({
        id: res.listingId,
        title: res.title,
        city: listingForm.city,
      });
      setNotice(res.message);
      setStep(2);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function submitAuction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const sDate = new Date(startAtValue);
    const eDate = new Date(endAtValue);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
      return setError("Please provide valid start and closing dates.");
    }
    if (eDate.getTime() <= sDate.getTime()) {
      return setError("The auction closing time must be after the start time.");
    }
    if (eDate.getTime() - sDate.getTime() < 30 * 60 * 1000) {
      return setError("Auction duration must be at least 30 minutes.");
    }

    const fd = new FormData(e.currentTarget);
    fd.set("startAt", sDate.toISOString());
    fd.set("endAt", eDate.toISOString());
    if (startingPrice) fd.set("startingPrice", startingPrice);
    if (minBidIncrement) fd.set("minBidIncrement", minBidIncrement);
    if (reservePrice) fd.set("reservePrice", reservePrice);
    if (terms) fd.set("terms", terms);

    setError(null);
    setBusy(true);
    try {
      const res = await createAuctionDraftAction(fd);
      if (!res.success) return setError(res.error);
      setFeeData({
        id: res.fee.id,
        amount: res.fee.amount,
        ratePercent: res.fee.ratePercent,
        basisAmount: res.fee.basisAmount,
        currency: res.fee.currency,
        auctionId: res.auctionId,
      });
      setNotice("Auction schedule saved! Now complete the entry fee payment.");
      setStep(3);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePayBankTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!feeData) return;
    if (!bankRef.trim() || bankRef.trim().length < 4) {
      return setError(
        "Enter the bank reference or mobile money transaction ID (minimum 4 characters).",
      );
    }
    if (!transactionUrl.trim())
      return setError("Enter a link to the transaction confirmation.");
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("feeId", feeData.id);
      fd.set("reference", bankRef.trim());
      fd.set("transactionUrl", transactionUrl.trim());
      setProgress("Submitting payment for review…");
      const res = await submitBankTransferAction(fd);
      if (!res.success) return setError(res.error);
      setNotice(
        "Entry fee payment submitted! Your listing is now Under Review by our administrators.",
      );
      setStep(4);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePayChapa() {
    if (!feeData) return;
    setError(null);
    setBusy(true);
    try {
      const res = await payEntryFeeWithChapaAction(feeData.id);
      if (!res.success) return setError(res.error);
      if (res.checkoutUrl) {
        window.open(res.checkoutUrl, "_blank");
        setNotice(
          "Chapa payment initiated. Once confirmed, your listing moves to Under Review.",
        );
        setStep(4);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 backdrop-blur-sm sm:p-5 ${styles.backdrop}`}
    >
      <div
        aria-labelledby="listing-wizard-title"
        aria-modal="true"
        className={`w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-[1.75rem] border border-white/70 p-4 sm:p-6 ${styles.dialog}`}
        role="dialog"
      >
        <div className={styles.progressHeader}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600">
                Seller workspace
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Step {step} of {steps.length} · about{" "}
                {Math.max(1, steps.length - step + 1)} step
                {steps.length - step + 1 === 1 ? "" : "s"} remaining
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close listing form"
              title="Close form"
            >
              <X size={18} />
            </button>
          </div>

          {/* Step Progress Indicator */}
          <div className="flex items-start justify-between gap-1 sm:gap-3">
            {steps.map((s) => {
              const isActive = step === s.number;
              const isCompleted = step > s.number;
              return (
                <div
                  key={s.number}
                  className="flex min-w-0 flex-1 items-start gap-1 sm:gap-3"
                >
                  <div className="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
                    <div
                      className={`${styles.stepIcon} ${
                        isActive
                          ? styles.stepIconActive
                          : isCompleted
                            ? styles.stepIconComplete
                            : ""
                      }`}
                    >
                      {isCompleted ? <Check size={15} /> : s.number}
                    </div>
                    <div className="min-w-0 text-center sm:text-left">
                      <p
                        className={`truncate text-[10px] font-bold sm:text-xs ${
                          isActive
                            ? styles.stepLabelActive
                            : isCompleted
                              ? styles.stepLabelComplete
                              : styles.stepLabel
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="hidden text-[10px] text-slate-400 sm:block">
                        {s.description}
                      </p>
                    </div>
                  </div>
                  {s.number < steps.length && (
                    <div
                      className={`${styles.progressSegment} mt-[1.05rem] hidden sm:block`}
                    >
                      <div
                        className={styles.progressSegmentFill}
                        style={{ width: isCompleted ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-slate-200/80 pt-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              {step === 1 && <PackagePlus size={20} />}
              {step === 2 && <Gavel size={20} />}
              {step === 3 && <CreditCard size={20} />}
              {step === 4 && <Clock size={20} />}
            </div>
            <div>
              <h2
                id="listing-wizard-title"
                className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg"
              >
                {step === 1 && "Create your listing"}
                {step === 2 && "Set up your auction"}
                {step === 3 && "Complete the entry fee"}
                {step === 4 && "Your listing is under review"}
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                {step === 1 &&
                  "Share accurate details so buyers can confidently find your asset."}
                {step === 2 &&
                  "Choose transparent pricing and a schedule that works for buyers."}
                {step === 3 &&
                  "Submit the entry fee details to send your listing for review."}
                {step === 4 &&
                  "We’ll notify you when the platform review is complete."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 pt-5">
          {notice && step !== 3 && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {notice}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {/* ───────── STEP 1 ───────── */}
          {step === 1 && (
            <form
              onSubmit={submitListing}
              className={`space-y-5 text-xs sm:space-y-6 ${styles.stepContent}`}
            >
              {/* Category Selector Cards */}
              <div
                className={`rounded-2xl border bg-white p-4 shadow-sm space-y-3 sm:p-5 ${styles.section}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-600" />
                      Select Asset Category *
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Choose the primary asset classification for public
                      marketplace indexing
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                    Step 1 of 4
                  </span>
                </div>

                <input
                  type="hidden"
                  name="categoryId"
                  value={selectedCategoryId || categories[0]?.id || ""}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {categories.map((c) => {
                    const isSelected =
                      (selectedCategoryId || categories[0]?.id) === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(c.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 font-bold scale-[1.01]"
                            : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/40"
                        }`}
                      >
                        <span className="text-xl shrink-0">
                          {getCategoryIcon(c.name)}
                        </span>
                        <span className="text-xs truncate">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic Information Card */}
              <div
                className={`rounded-2xl border bg-white p-4 shadow-sm space-y-3.5 sm:p-5 ${styles.section}`}
              >
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PackagePlus size={16} className="text-blue-600" />
                    Item Details & Location
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Accurate details help qualified buyers find your listing
                  </p>
                </div>

                <AnimatedInput
                  label="Listing title *"
                  name="title"
                  value={listingForm.title}
                  onChange={(v) => setListingForm({ ...listingForm, title: v })}
                  required
                  minLength={5}
                  maxLength={200}
                  placeholder="e.g. 3-Storey Luxury Villa in CMC, Toyota Land Cruiser V8 2023"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AnimatedInput
                    label="City *"
                    name="city"
                    value={listingForm.city}
                    onChange={(v) =>
                      setListingForm({ ...listingForm, city: v })
                    }
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="e.g. Addis Ababa"
                  />
                  <AnimatedInput
                    label="Subcity / Region"
                    name="region"
                    value={listingForm.region}
                    onChange={(v) =>
                      setListingForm({ ...listingForm, region: v })
                    }
                    maxLength={100}
                    placeholder="e.g. Bole, Kirkos, Yeka"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AnimatedInput
                    label="Physical address / landmark"
                    name="address"
                    value={listingForm.address}
                    onChange={(v) =>
                      setListingForm({ ...listingForm, address: v })
                    }
                    maxLength={200}
                    placeholder="e.g. Near Edna Mall, Block 14"
                  />
                  <AnimatedInput
                    label="Reference / Title / VIN Number"
                    name="referenceNumber"
                    value={listingForm.referenceNumber}
                    onChange={(v) =>
                      setListingForm({ ...listingForm, referenceNumber: v })
                    }
                    maxLength={50}
                    placeholder="e.g. ETH-PRP-2026-9021"
                  />
                </div>

                <div>
                  <AnimatedInput
                    label="Comprehensive description *"
                    name="description"
                    value={listingForm.description}
                    onChange={(v) =>
                      setListingForm({ ...listingForm, description: v })
                    }
                    required
                    minLength={20}
                    maxLength={2000}
                    placeholder="Detailed specs, legal title status, year of construction/manufacture, condition, utility connections…"
                  />
                </div>

                <AnimatedInput
                  label="Key highlights / features (comma-separated)"
                  name="features"
                  value={listingForm.features}
                  onChange={(v) =>
                    setListingForm({ ...listingForm, features: v })
                  }
                  maxLength={500}
                  placeholder="4 Bedrooms, 300 m² Compound, 3-Phase Power, Backup Generator, Parking"
                />
              </div>

              {/* Media Uploads Card */}
              <div
                className={`rounded-2xl border bg-white p-4 shadow-sm space-y-4 sm:p-5 ${styles.section}`}
              >
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ImagePlus size={16} className="text-blue-600" />
                      High-Resolution Photos & Social Video Link
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      High quality visuals drastically increase bidder
                      confidence
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      images.length >= MIN_LISTING_IMAGES
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {images.length} of {MIN_LISTING_IMAGES}+ Photos
                  </span>
                </div>

                <div>
                  <label className="flex flex-col cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-6 text-slate-500 hover:border-blue-400 hover:bg-blue-50/20 hover:text-blue-600 transition">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-blue-600">
                      <ImagePlus size={20} />
                    </div>
                    <span className="font-semibold text-slate-700 text-xs">
                      Click to browse and upload item photos
                    </span>
                    <span className="text-[11px] text-slate-400">
                      JPG, PNG, or WebP up to 8 MB each. First photo is
                      designated as the primary cover.
                    </span>
                    <input
                      type="file"
                      accept={IMG_TYPES.join(",")}
                      multiple
                      className="hidden"
                      onChange={addImages}
                    />
                  </label>

                  {previews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {previews.map((src, i) => (
                        <div
                          key={src}
                          className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 group shadow-sm"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`Photo ${i + 1}`}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                          {i === 0 && (
                            <span className="absolute left-1 top-1 rounded-md bg-blue-600/90 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                              ★ Cover
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setImages((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                            className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-rose-600 shadow-sm hover:bg-white hover:scale-110 transition"
                            aria-label={`Remove photo ${i + 1}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className={label} htmlFor="videoUrl">
                    Item Video Post Link *
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-3">
                      <Film size={18} className="text-blue-600 shrink-0" />
                      <p className="text-xs text-slate-500">
                        Paste the link to a public video post. We accept
                        YouTube, TikTok, Instagram, Facebook, and X posts.
                      </p>
                    </div>
                    <input
                      id="videoUrl"
                      name="videoUrl"
                      type="url"
                      required
                      value={videoUrl}
                      onChange={(event) => setVideoUrl(event.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={`${input} mt-3`}
                    />
                  </div>
                </div>
              </div>

              {/* Legal Ownership & Biometric Verification Card */}
              <div
                className={`rounded-2xl border bg-white p-4 shadow-sm space-y-4 sm:p-5 ${styles.section}`}
              >
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      Legal Ownership & Biometric Verification
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Confidential identity verification reviewed strictly by
                      platform administrators
                    </p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    🔒 Admin-Only Access
                  </span>
                </div>

                <AnimatedInput
                  label="National ID / Passport Number *"
                  name="nationalIdNumber"
                  value={listingForm.nationalIdNumber}
                  onChange={(v) =>
                    setListingForm({ ...listingForm, nationalIdNumber: v })
                  }
                  required
                  minLength={4}
                  maxLength={50}
                  placeholder="e.g. 1234 5678 9012 (Fayda / Passport / Kebele ID)"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>National ID Scan or Photo *</label>
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-slate-600 hover:border-blue-400 hover:bg-white transition">
                      <div className="flex items-center gap-2 truncate">
                        <FileText
                          size={16}
                          className="text-blue-600 shrink-0"
                        />
                        <span className="truncate text-slate-700 font-medium">
                          {idDoc ? idDoc.name : "Upload National ID"}
                        </span>
                      </div>
                      <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold border border-slate-200 text-slate-700">
                        {idDoc ? "✓ Loaded" : "Choose"}
                      </span>
                      <input
                        type="file"
                        accept={[...IMG_TYPES, "application/pdf"].join(",")}
                        className="hidden"
                        onChange={pickDoc(setIdDoc)}
                      />
                    </label>
                  </div>

                  <div>
                    <label className={label}>
                      Title Deed / Libre (Optional)
                    </label>
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-slate-600 hover:border-blue-400 hover:bg-white transition">
                      <div className="flex items-center gap-2 truncate">
                        <FileText
                          size={16}
                          className="text-emerald-600 shrink-0"
                        />
                        <span className="truncate text-slate-700 font-medium">
                          {ownershipDoc
                            ? ownershipDoc.name
                            : "Upload Title Deed / Libre"}
                        </span>
                      </div>
                      <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold border border-slate-200 text-slate-700">
                        {ownershipDoc ? "✓ Loaded" : "Choose"}
                      </span>
                      <input
                        type="file"
                        accept={[...IMG_TYPES, "application/pdf"].join(",")}
                        className="hidden"
                        onChange={pickDoc(setOwnershipDoc)}
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-xs">
                      Biometric Fingerprint / Passkey Authorization *
                    </label>
                    {verificationId && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    )}
                  </div>
                  <BiometricButton
                    verificationId={verificationId}
                    onVerified={setVerificationId}
                    disabled={busy}
                  />
                  <p className="text-[11px] text-slate-500">
                    Your device scans the biometric sensor securely via WebAuthn
                    standard. We only receive a cryptographic signed proof.
                    Valid for 15 minutes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {busy
                    ? progress || "Processing…"
                    : "Continue to Schedule Auction →"}
                </button>
              </div>
            </form>
          )}

          {/* ───────── STEP 2: AUCTION SCHEDULE & PRICING ───────── */}
          {step === 2 &&
            (options.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <PackagePlus size={28} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    No Draft Listings Found
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    To schedule an auction, please register your item listing
                    and upload documents first.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white shadow hover:bg-blue-700 text-xs"
                >
                  ← Add Property Listing
                </button>
              </div>
            ) : (
              <form
                onSubmit={submitAuction}
                className={`space-y-5 text-xs ${styles.stepContent}`}
              >
                {/* Assist Dialog Guidance Modal */}
                {showScheduleGuide && (
                  <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-blue-100">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
                            <Lightbulb size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              Auction Timing & Pricing Strategy Guide
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Proven guidelines to maximize bidding competition
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowScheduleGuide(false)}
                          className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                          aria-label="Close Guide"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="space-y-3 text-[11px]">
                        <div className="flex items-start gap-3 rounded-xl bg-amber-50/70 p-3 border border-amber-200/70">
                          <Clock
                            size={16}
                            className="text-amber-600 mt-0.5 shrink-0"
                          />
                          <div>
                            <strong className="text-amber-900 block text-xs">
                              Peak Bidding Hours: 6:00 PM – 9:00 PM (18:00 –
                              21:00 EAT)
                            </strong>
                            <p className="text-amber-800 mt-0.5">
                              Over 75% of active bids in Ethiopia occur during
                              evening hours when buyers are off work and
                              reviewing marketplace auctions. Avoid closing
                              during business hours or midnight.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-xl bg-blue-50/70 p-3 border border-blue-200/70">
                          <Calendar
                            size={16}
                            className="text-blue-600 mt-0.5 shrink-0"
                          />
                          <div>
                            <strong className="text-blue-900 block text-xs">
                              Optimal Duration: 5 to 7 Days
                            </strong>
                            <p className="text-blue-800 mt-0.5">
                              A 7-day window gives buyers ample time to review
                              property surveys, coordinate bank transfer limits,
                              and receive live bid SMS/email alerts.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/70">
                          <ShieldCheck
                            size={16}
                            className="text-emerald-600 mt-0.5 shrink-0"
                          />
                          <div>
                            <strong className="text-emerald-900 block text-xs">
                              Anti-Sniping Soft-Close Protection
                            </strong>
                            <p className="text-emerald-800 mt-0.5">
                              The platform includes automatic soft-close. If a
                              bid is submitted in the final 2 minutes, the timer
                              automatically extends by 2 minutes, preventing bot
                              sniping.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200">
                          <Zap
                            size={16}
                            className="text-purple-600 mt-0.5 shrink-0"
                          />
                          <div>
                            <strong className="text-slate-900 block text-xs">
                              Bid Increment Recommendations
                            </strong>
                            <p className="text-slate-600 mt-0.5">
                              Set your bid increment between 0.5% and 2% of the
                              starting price. Increments that are too large
                              scare away genuine bidders.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            now.setMinutes(
                              Math.ceil(now.getMinutes() / 5) * 5 + 30,
                              0,
                              0,
                            );
                            const end = new Date(
                              now.getTime() + 7 * 24 * 60 * 60 * 1000,
                            );
                            end.setHours(19, 0, 0, 0);
                            setStartAtValue(toDatetimeLocal(now));
                            setEndAtValue(toDatetimeLocal(end));
                            setShowScheduleGuide(false);
                          }}
                          className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white shadow hover:bg-blue-700 text-xs flex items-center justify-center gap-1.5"
                        >
                          <Sparkles size={14} /> Apply Recommended 7-Day
                          Schedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowScheduleGuide(false)}
                          className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 text-xs"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assist Guidance Banner Bar */}
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0 font-bold shadow-xs">
                      <Lightbulb size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                        Scheduling Best Practices for Ethiopia
                        <span className="rounded bg-blue-200/60 px-1.5 py-0.2 text-[10px] text-blue-800">
                          EAT UTC+3
                        </span>
                      </h4>
                      <p className="text-[11px] text-blue-800/80">
                        Evenings (6 PM – 9 PM) generate 40%+ more bidding
                        activity.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScheduleGuide(true)}
                    className="rounded-xl bg-white border border-blue-200 px-3.5 py-2 font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    Timing Guide & Tips
                  </button>
                </div>

                {/* Target Listing Selection */}
                <div
                  className={`rounded-2xl border bg-white p-4 shadow-sm space-y-2 sm:p-5 ${styles.section}`}
                >
                  <label className={label}>Select Target Listing *</label>
                  <select
                    name="listingId"
                    defaultValue={
                      created?.id ?? initialListingId ?? options[0].id
                    }
                    className={input}
                  >
                    {options.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                        {l.city ? ` (${l.city})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pricing & Increment Card */}
                <div
                  className={`rounded-2xl border bg-white p-4 shadow-sm space-y-4 sm:p-5 ${styles.section}`}
                >
                  <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Gavel size={16} className="text-blue-600" />
                      Pricing & Increments
                    </h3>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Currency: ETB (Ethiopian Birr)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={label}>Starting price * (ETB)</label>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          name="startingPrice"
                          required
                          min="1"
                          step="any"
                          value={startingPrice}
                          onChange={(e) => setStartingPrice(e.target.value)}
                          placeholder="e.g. 5000000"
                          className={`${input} pr-14 font-semibold text-slate-900`}
                        />
                        <span className="absolute right-3 top-2.5 font-bold text-slate-400 text-xs">
                          ETB
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Opening price for the first bidder to meet.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={label}>
                          Minimum bid increment * (≥ 0.5%)
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          name="minBidIncrement"
                          required
                          min="1"
                          step="any"
                          value={minBidIncrement}
                          onChange={(e) => setMinBidIncrement(e.target.value)}
                          placeholder="e.g. 50000"
                          className={`${input} pr-14 font-semibold text-slate-900`}
                        />
                        <span className="absolute right-3 top-2.5 font-bold text-slate-400 text-xs">
                          ETB
                        </span>
                      </div>

                      {/* Auto-suggest increment chips */}
                      {parseFloat(startingPrice) > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400">
                            Quick suggestions:
                          </span>
                          {[
                            { label: "0.5%", mult: 0.005 },
                            { label: "1% (Best)", mult: 0.01 },
                            { label: "2%", mult: 0.02 },
                            { label: "5%", mult: 0.05 },
                          ].map((s) => {
                            const val = Math.max(
                              1,
                              Math.round(parseFloat(startingPrice) * s.mult),
                            );
                            return (
                              <button
                                key={s.label}
                                type="button"
                                onClick={() => setMinBidIncrement(String(val))}
                                className="rounded-md bg-slate-100 hover:bg-blue-100 hover:text-blue-700 px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition"
                              >
                                {s.label}: {val.toLocaleString()}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={label}>
                        Confidential reserve price (Optional)
                      </label>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                        🔒 Kept 100% Secret
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        name="reservePrice"
                        min="1"
                        step="any"
                        value={reservePrice}
                        onChange={(e) => setReservePrice(e.target.value)}
                        placeholder="Lowest confidential price you are willing to accept"
                        className={`${input} pr-14`}
                      />
                      <span className="absolute right-3 top-2.5 font-bold text-slate-400 text-xs">
                        ETB
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Bidders will never see this amount. If bidding ends below
                      your reserve, you are under no legal obligation to sell.
                    </p>
                  </div>
                </div>

                {/* Schedule Dates & Times Card */}
                <div
                  className={`rounded-2xl border bg-white p-4 shadow-sm space-y-4 sm:p-5 ${styles.section}`}
                >
                  <div className="border-b border-slate-100 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Calendar size={16} className="text-blue-600" />
                        Auction Schedule & Closing Window
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Times are set in East Africa Time (Addis Ababa, UTC+3)
                      </p>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400">
                        Presets:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          now.setMinutes(
                            Math.ceil(now.getMinutes() / 5) * 5,
                            0,
                            0,
                          );
                          setStartAtValue(toDatetimeLocal(now));
                        }}
                        className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 transition"
                      >
                        ⚡ Start Now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(9, 0, 0, 0);
                          setStartAtValue(toDatetimeLocal(tomorrow));
                          const end = new Date(
                            tomorrow.getTime() + 7 * 24 * 60 * 60 * 1000,
                          );
                          end.setHours(19, 0, 0, 0);
                          setEndAtValue(toDatetimeLocal(end));
                        }}
                        className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 transition"
                      >
                        🌅 Tomorrow 9 AM
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Auction starts * (EAT)</label>
                      <input
                        type="datetime-local"
                        name="startAt"
                        required
                        value={startAtValue}
                        onChange={(e) => setStartAtValue(e.target.value)}
                        className={input}
                      />
                    </div>

                    <div>
                      <label className={label}>
                        Auction ends * (Closes automatically)
                      </label>
                      <input
                        type="datetime-local"
                        name="endAt"
                        required
                        value={endAtValue}
                        onChange={(e) => setEndAtValue(e.target.value)}
                        className={input}
                      />
                    </div>
                  </div>

                  {/* Duration Presets Bar */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Set Duration from Start:
                    </span>
                    {[
                      { label: "3 Days", days: 3 },
                      { label: "5 Days", days: 5 },
                      { label: "7 Days (⭐ Recommended)", days: 7 },
                      { label: "10 Days", days: 10 },
                      { label: "14 Days", days: 14 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          const base = startAtValue
                            ? new Date(startAtValue)
                            : new Date();
                          if (isNaN(base.getTime())) return;
                          const newEnd = new Date(
                            base.getTime() + p.days * 24 * 60 * 60 * 1000,
                          );
                          newEnd.setHours(19, 0, 0, 0);
                          setEndAtValue(toDatetimeLocal(newEnd));
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 text-[10px] font-bold text-slate-700 transition"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Live Duration & Schedule Feedback Card */}
                  {(() => {
                    const dInfo = computeDuration(startAtValue, endAtValue);
                    if (!dInfo) return null;
                    if (!dInfo.valid) {
                      return (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 flex items-center gap-2">
                          <AlertCircle size={15} />
                          <span>{dInfo.text}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-bold text-slate-800">
                            <Clock size={15} className="text-blue-600" />
                            <span>Total Duration: {dInfo.label}</span>
                          </div>
                          {dInfo.isEveningClosing ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[10px] font-bold text-emerald-800">
                              <Sparkles size={12} />
                              Optimal Evening Closing Window (6–9 PM)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-[10px] font-semibold text-amber-800">
                              <Info size={12} />
                              Non-Peak Closing Time (Tip: 6–9 PM EAT is best)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Requirements & Terms */}
                <div
                  className={`rounded-2xl border bg-white p-4 shadow-sm space-y-2 sm:p-5 ${styles.section}`}
                >
                  <label className={label}>
                    Requirements and Seller Terms (Optional)
                  </label>
                  <textarea
                    name="terms"
                    rows={3}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="e.g. 10% refundable bid deposit required. Winner must complete remaining transfer payment within 5 business days at Commercial Bank of Ethiopia. Physical site inspection allowed on Saturdays."
                    className={`${input} p-3 leading-relaxed`}
                  />
                </div>

                {/* Workflow Notice */}
                <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 text-blue-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-blue-950">
                    <CreditCard size={15} className="text-blue-600" />
                    What happens next?
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Submitting will calculate the listing entry fee based on
                    your starting price. You will proceed to{" "}
                    <strong>Pay Entry Fee</strong> (via CBE, Telebirr, or
                    Chapa). Once submitted, administrators inspect the full
                    legal documentation before pushing it to the public{" "}
                    <strong>Live Bid Marketplace</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    ← Back to Details
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {busy
                      ? "Calculating Entry Fee…"
                      : "Continue to Pay Entry Fee →"}
                  </button>
                </div>
              </form>
            ))}

          {/* ───────── STEP 3: PAY ENTRY FEE ───────── */}
          {step === 3 && feeData && (
            <div className={`space-y-5 text-xs ${styles.stepContent}`}>
              <div
                className={`rounded-2xl border border-blue-100 bg-blue-50/50 p-4 ${styles.section}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 font-medium">
                      Starting Price
                    </span>
                    <p className="text-lg font-bold text-slate-900">
                      {Number(feeData.basisAmount).toLocaleString()}{" "}
                      {feeData.currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-blue-600 font-medium">
                      Required Entry Fee ({feeData.ratePercent}%)
                    </span>
                    <p className="text-2xl font-black text-blue-700">
                      {Number(feeData.amount).toLocaleString()}{" "}
                      {feeData.currency}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  All auction listings require an entry fee before
                  administrative review and public Live Bidding publishing.
                </p>
              </div>

              {/* Payment Method Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPaymentTab("bank")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                    paymentTab === "bank"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 size={15} />
                  Bank Transfer / Telebirr
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab("chapa")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                    paymentTab === "chapa"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <CreditCard size={15} />
                  Chapa Online Payment
                </button>
              </div>

              {paymentTab === "bank" ? (
                <form onSubmit={handlePayBankTransfer} className="space-y-4">
                  <div
                    className={`rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 ${styles.section}`}
                  >
                    <h4 className="font-bold text-slate-800">
                      Direct Deposit / Mobile Transfer Accounts
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                        <p className="font-bold text-slate-900">
                          Commercial Bank of Ethiopia (CBE)
                        </p>
                        <p className="font-mono text-blue-600 font-semibold">
                          1000234567891
                        </p>
                        <p className="text-slate-400">
                          Ethiopian Heritage & Realty Escrow
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                        <p className="font-bold text-slate-900">
                          Telebirr SuperApp / CBE Birr
                        </p>
                        <p className="font-mono text-emerald-600 font-semibold">
                          +251 911 234 567
                        </p>
                        <p className="text-slate-400">
                          Marketplace Entry Fee Merchant
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={label}>
                      Bank Reference / Transaction ID * (Required)
                    </label>
                    <input
                      type="text"
                      required
                      value={bankRef}
                      onChange={(e) => setBankRef(e.target.value)}
                      placeholder="e.g. FT241098234, CBE-87654321, or Telebirr Txn ID"
                      className={input}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Transfer the exact amount of{" "}
                      {Number(feeData.amount).toLocaleString()}{" "}
                      {feeData.currency} and paste your transaction reference
                      above.
                    </p>
                  </div>

                  <div>
                    <label className={label} htmlFor="transaction-url">
                      Transaction Confirmation Link * (Required)
                    </label>
                    <input
                      id="transaction-url"
                      type="url"
                      required
                      value={transactionUrl}
                      onChange={(e) => setTransactionUrl(e.target.value)}
                      placeholder="https://bank.example/transactions/..."
                      className={input}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Paste a secure HTTPS link to the transaction details or
                      confirmation page. Do not upload a file or screenshot.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      ← Back to Schedule
                    </button>
                    <button
                      type="submit"
                      disabled={
                        busy || !bankRef.trim() || !transactionUrl.trim()
                      }
                      className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busy
                        ? progress || "Submitting Payment…"
                        : "Submit Payment & Send for Review"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-center space-y-2 ${styles.section}`}
                  >
                    <CreditCard className="mx-auto text-blue-600" size={32} />
                    <h4 className="font-bold text-slate-800">
                      Pay Instantly with Chapa
                    </h4>
                    <p className="text-slate-500 text-xs">
                      Pay securely with Debit Card, CBE Birr, Awash Birr, or
                      Telebirr via Chapa.
                    </p>
                    <div className="text-xl font-bold text-slate-900 pt-2">
                      {Number(feeData.amount).toLocaleString()}{" "}
                      {feeData.currency}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      ← Back to Schedule
                    </button>
                    <button
                      type="button"
                      onClick={handlePayChapa}
                      disabled={busy}
                      className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy
                        ? "Connecting to Chapa…"
                        : "Pay Entry Fee with Chapa →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────── STEP 4: UNDER REVIEW ───────── */}
          {step === 4 && (
            <div className={`space-y-5 py-4 text-center ${styles.stepContent}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Clock size={36} />
              </div>

              <div>
                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800 text-xs mb-2">
                  STATUS: UNDER REVIEW
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Listing & Payment Submitted!
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  Your item listing, auction schedule, and entry fee payment
                  have been submitted for administrator review.
                </p>
              </div>

              <div
                className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2 max-w-md mx-auto text-xs ${styles.section}`}
              >
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Listing:</span>
                  <strong className="text-slate-900">
                    {created?.title || "Auction Item"}
                  </strong>
                </div>
                {feeData && (
                  <>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Starting Price:</span>
                      <strong className="text-slate-900">
                        {Number(feeData.basisAmount).toLocaleString()}{" "}
                        {feeData.currency}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Entry Fee:</span>
                      <strong className="text-blue-600 font-bold">
                        {Number(feeData.amount).toLocaleString()}{" "}
                        {feeData.currency}
                      </strong>
                    </div>
                  </>
                )}
                {bankRef && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Payment Reference:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {bankRef}
                    </span>
                  </div>
                )}
                {transactionUrl && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Transaction Link:</span>
                    <a
                      href={transactionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-[65%] truncate font-semibold text-blue-700 underline"
                    >
                      Open transaction details
                    </a>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Next Step:</span>
                  <span className="text-amber-700 font-semibold">
                    Admin will inspect documents & publish to Live Bidding
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
              >
                Finish & Return to My Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
