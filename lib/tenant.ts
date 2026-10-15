/** Scope a Prisma `where` to the signed-in user's organisation. */
export const tenantWhere = (user: { tenantId: string | null }) =>
  user.tenantId ? { tenantId: user.tenantId } : {};

/** True when both sides carry a tenant and they differ. */
export const crossTenant = (a?: string | null, b?: string | null) =>
  !!a && !!b && a !== b;
