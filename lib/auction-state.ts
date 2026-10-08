import type { AuctionStatus } from "@/app/generated/prisma/enums";

/** Who is performing the transition. SYSTEM = scheduled job / closing worker. */
export type AuctionActor = "SELLER" | "ADMIN" | "SYSTEM";

export type TransitionContext = {
  /** Whether the auction already has at least one bid. */
  hasBids?: boolean;
};

type Edge = { to: AuctionStatus; actors: AuctionActor[] };

/**
 * The only legal status changes. Anything not listed here is rejected.
 *
 * DRAFT ──► PENDING_APPROVAL ──► SCHEDULED ──► ACTIVE ──► CLOSED ──► COMPLETED
 *   │             │                  │           │  ▲
 *   │             ▼ (changes asked)  ▼           ▼  │
 *   │           DRAFT            SUSPENDED ◄────────┘
 *   └──────────────► CANCELLED ◄──────┘
 */
const TRANSITIONS: Record<AuctionStatus, Edge[]> = {
  DRAFT: [
    { to: "PENDING_APPROVAL", actors: ["SELLER", "ADMIN"] },
    { to: "CANCELLED", actors: ["SELLER", "ADMIN"] },
  ],
  PENDING_APPROVAL: [
    { to: "SCHEDULED", actors: ["ADMIN"] }, // approve
    { to: "DRAFT", actors: ["ADMIN"] }, // reject / request changes
    { to: "CANCELLED", actors: ["SELLER", "ADMIN"] },
  ],
  SCHEDULED: [
    { to: "ACTIVE", actors: ["SYSTEM"] }, // startAt reached
    { to: "SUSPENDED", actors: ["ADMIN"] },
    { to: "CANCELLED", actors: ["SELLER", "ADMIN"] },
  ],
  ACTIVE: [
    { to: "CLOSED", actors: ["SYSTEM"] }, // endAt reached
    { to: "SUSPENDED", actors: ["ADMIN"] },
    { to: "CANCELLED", actors: ["SELLER", "ADMIN"] }, // seller only if no bids
  ],
  SUSPENDED: [
    { to: "ACTIVE", actors: ["ADMIN"] },
    { to: "SCHEDULED", actors: ["ADMIN"] },
    { to: "CANCELLED", actors: ["ADMIN"] },
  ],
  CLOSED: [
    { to: "COMPLETED", actors: ["SYSTEM", "ADMIN"] }, // payment settled
    { to: "CANCELLED", actors: ["ADMIN"] }, // winner defaulted / dispute
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export class InvalidAuctionTransitionError extends Error {
  constructor(
    public from: AuctionStatus,
    public to: AuctionStatus,
    public actor: AuctionActor,
  ) {
    super(`Auction cannot move from ${from} to ${to} (actor: ${actor}).`);
    this.name = "InvalidAuctionTransitionError";
  }
}

export function canTransition(
  from: AuctionStatus,
  to: AuctionStatus,
  actor: AuctionActor,
  ctx: TransitionContext = {},
): boolean {
  const edge = TRANSITIONS[from].find((e) => e.to === to);
  if (!edge || !edge.actors.includes(actor)) return false;

  // A seller may not cancel an active auction once bidding has started.
  if (
    actor === "SELLER" &&
    from === "ACTIVE" &&
    to === "CANCELLED" &&
    ctx.hasBids
  ) {
    return false;
  }
  return true;
}

export function assertTransition(
  from: AuctionStatus,
  to: AuctionStatus,
  actor: AuctionActor,
  ctx: TransitionContext = {},
): void {
  if (!canTransition(from, to, actor, ctx)) {
    throw new InvalidAuctionTransitionError(from, to, actor);
  }
}

export function allowedTransitions(
  from: AuctionStatus,
  actor: AuctionActor,
  ctx: TransitionContext = {},
): AuctionStatus[] {
  return TRANSITIONS[from]
    .map((e) => e.to)
    .filter((to) => canTransition(from, to, actor, ctx));
}

export const isTerminal = (s: AuctionStatus) => TRANSITIONS[s].length === 0;

/** True only while bids may be accepted. Use inside the bid transaction. */
export function isOpenForBids(
  auction: { status: AuctionStatus; startAt: Date; endAt: Date },
  now: Date = new Date(),
): boolean {
  return (
    auction.status === "ACTIVE" && now >= auction.startAt && now < auction.endAt
  );
}
