import type { UserRole } from "@/app/generated/prisma/enums";

export type AppRole = UserRole;

export const PERMISSIONS = [
  // Buyer
  "listing:search",
  "auction:bid",
  "auction:watch",
  "payment:settle",
  "ticket:create",
  // Seller
  "seller:kyc:submit",
  "listing:create",
  "listing:manage:own",
  "auction:create",
  "auction:manage:own",
  // Buyer + Seller
  "report:own",
  // Admin
  "seller:verify",
  "listing:approve",
  "auction:approve",
  "auction:moderate",
  "bid:monitor:all",
  "payment:monitor",
  "payment:verify",
  "user:manage",
  "category:manage",
  "ticket:manage:all",
  "settings:manage",
  "audit:view",
  "report:all",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const COMMON: Permission[] = ["listing:search", "ticket:create", "report:own"];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  BUYER: [...COMMON, "auction:bid", "auction:watch", "payment:settle"],
  SELLER: [
    ...COMMON,
    "seller:kyc:submit",
    "listing:create",
    "listing:manage:own",
    "auction:create",
    "auction:manage:own",
  ],
  ADMIN: [...PERMISSIONS],
};

type UserLike = {
  role: UserRole;
  roleDef?: { permissions: string[] } | null;
};

export function permissionsFor(user: UserLike): string[] {
  return user.roleDef?.permissions ?? DEFAULT_ROLE_PERMISSIONS[user.role];
}

export function can(user: UserLike | null | undefined, permission: Permission) {
  return !!user && permissionsFor(user).includes(permission);
}

export const isAdmin = (r?: UserRole | null) => r === "ADMIN";
export const isSeller = (r?: UserRole | null) => r === "SELLER";
export const isBuyer = (r?: UserRole | null) => r === "BUYER";

export function roleHome(role: UserRole) {
  return role === "ADMIN" ? "/admin" : role === "SELLER" ? "/seller" : "/buyer";
}

export function getRoleLabel(role?: UserRole | null) {
  return role === "ADMIN"
    ? "Platform Administrator"
    : role === "SELLER"
      ? "Seller"
      : role === "BUYER"
        ? "Buyer / Bidder"
        : "Guest";
}
