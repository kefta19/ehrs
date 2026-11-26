import type { Prisma } from "@/app/generated/prisma/client";

export type AuctionDirection = "FORWARD" | "REVERSE";

export const SOFT_CLOSE_WINDOW_MS = 5 * 60 * 1000;
export const SOFT_CLOSE_EXTENSION_MS = 5 * 60 * 1000;
export const MAX_SOFT_CLOSE_EXTENSIONS = 10;

export function winningBidOrder(type: AuctionDirection) {
  return type === "REVERSE" ? "asc" : "desc";
}

export function bidBoundary(input: {
  type: AuctionDirection;
  current: Prisma.Decimal;
  startingPrice: Prisma.Decimal;
  increment: Prisma.Decimal;
}) {
  if (input.current.isZero()) return input.startingPrice;
  return input.type === "REVERSE"
    ? input.current.sub(input.increment)
    : input.current.add(input.increment);
}

export function isValidBid(input: {
  type: AuctionDirection;
  amount: Prisma.Decimal;
  current: Prisma.Decimal;
  startingPrice: Prisma.Decimal;
  increment: Prisma.Decimal;
}) {
  if (!input.amount.gt(0)) return false;
  const boundary = bidBoundary(input);
  if (input.type === "REVERSE" && input.current.isZero())
    return input.amount.lte(boundary);
  return input.type === "REVERSE"
    ? boundary.gt(0) && input.amount.lte(boundary)
    : input.amount.gte(boundary);
}

export function extendedDeadline(input: {
  endAt: Date;
  now: Date;
  extensionCount: number;
}) {
  const remainingMs = input.endAt.getTime() - input.now.getTime();
  if (
    input.extensionCount >= MAX_SOFT_CLOSE_EXTENSIONS ||
    remainingMs <= 0 ||
    remainingMs > SOFT_CLOSE_WINDOW_MS
  ) {
    return null;
  }
  return new Date(input.endAt.getTime() + SOFT_CLOSE_EXTENSION_MS);
}
