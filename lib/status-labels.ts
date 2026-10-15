export type Tone = "amber" | "blue" | "emerald" | "slate" | "rose" | "purple";

export const TONE_CLASS: Record<Tone, string> = {
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  slate: "bg-slate-100 text-slate-700",
  rose: "bg-rose-50 text-rose-700",
  purple: "bg-purple-50 text-purple-700",
};

type Meta = { label: string; tone: Tone };

export function auctionStatusMeta(status?: string): Meta {
  switch (status) {
    case "DRAFT":
      return { label: "Draft", tone: "slate" };
    case "PENDING_APPROVAL":
      return { label: "Under Review – awaiting admin review", tone: "amber" };
    case "SCHEDULED":
      return { label: "Approved – goes live at start time", tone: "blue" };
    case "ACTIVE":
      return { label: "Live – bidding open", tone: "emerald" };
    case "SUSPENDED":
      return { label: "Suspended", tone: "rose" };
    case "CLOSED":
      return { label: "Closed – bidding ended", tone: "slate" };
    case "COMPLETED":
      return { label: "Completed", tone: "purple" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "rose" };
    default:
      return { label: status ?? "Unknown", tone: "slate" };
  }
}

export function listingStatusMeta(status?: string): Meta {
  switch (status) {
    case "DRAFT":
      return { label: "Draft – not submitted", tone: "slate" };
    case "PENDING_REVIEW":
      return { label: "Under Review – awaiting admin review", tone: "amber" };
    case "APPROVED":
      return { label: "Approved", tone: "emerald" };
    case "REJECTED":
      return { label: "Rejected – edit and resubmit", tone: "rose" };
    case "AUCTIONED":
      return { label: "Auctioned", tone: "purple" };
    default:
      return { label: status ?? "Unknown", tone: "slate" };
  }
}
