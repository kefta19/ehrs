import "server-only";

import { headers } from "next/headers";

import { getCurrentUser } from "./auth";
import { DEFAULT_BRANDING, type Branding } from "./branding-shared";
import { forbidden, HttpError, notFound } from "./http";
import { prisma } from "./prisma";
import { logAudit } from "./security";
import { brandingSchema } from "./validation";

type Actor = {
  id: string;
  role: "BUYER" | "SELLER" | "ADMIN";
  tenantId: string | null;
};

type Row = {
  companyName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
};

const toBranding = (r: Row): Branding => ({
  companyName: r.companyName,
  logoUrl: r.logoUrl,
  faviconUrl: r.faviconUrl,
  primaryColor: r.primaryColor,
  secondaryColor: r.secondaryColor,
  backgroundColor: r.backgroundColor,
  textColor: r.textColor,
});

/** The ONLY source of the tenant id for writes: the authenticated user. */
export function assertTenantAdmin(actor: Actor): string {
  if (actor.role !== "ADMIN")
    throw forbidden("Only administrators can change branding");
  if (!actor.tenantId)
    throw new HttpError(409, "Your account is not assigned to a tenant");
  return actor.tenantId;
}

/* ───────────── Tenant resolution ───────────── */

export async function resolveRequestTenantId(): Promise<string | null> {
  // 1. Authenticated session is authoritative.
  const user = await getCurrentUser();
  if (user?.tenantId) return user.tenantId;

  // 2. Public pages (login/register): host / subdomain.
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  if (host) {
    const root = process.env.TENANT_ROOT_DOMAIN?.toLowerCase();
    const or: Array<{ domain: string } | { slug: string }> = [
      { domain: host },
    ];
    if (root && host.endsWith(`.${root}`))
      or.push({ slug: host.slice(0, -(root.length + 1)) });
    const t = await prisma.tenant.findFirst({
      where: { isActive: true, OR: or },
      select: { id: true },
    });
    if (t) return t.id;
  }

  // 3. Default tenant.
  const def = await prisma.tenant.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true },
  });
  return def?.id ?? null;
}

export async function getBrandingByTenantId(
  tenantId?: string | null,
): Promise<Branding> {
  if (!tenantId) return DEFAULT_BRANDING;
  const row = await prisma.tenantBranding.findUnique({ where: { tenantId } });
  if (row) return toBranding(row);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  return {
    ...DEFAULT_BRANDING,
    companyName: tenant?.name ?? DEFAULT_BRANDING.companyName,
  };
}

export async function getRequestBranding(): Promise<Branding> {
  return getBrandingByTenantId(await resolveRequestTenantId());
}

/** Create-when-missing (race-safe via unique tenantId upsert). */
export async function getOrCreateBranding(tenantId: string): Promise<Branding> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  if (!tenant) throw notFound("Tenant not found");
  const row = await prisma.tenantBranding.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId, ...DEFAULT_BRANDING, companyName: tenant.name },
  });
  return toBranding(row);
}

/* ───────────── Mutations ───────────── */

export async function updateBranding(actor: Actor, input: unknown) {
  const tenantId = assertTenantAdmin(actor);
  const data = brandingSchema.parse(input);
  const previous = await getOrCreateBranding(tenantId);
  const row = await prisma.tenantBranding.update({ where: { tenantId }, data });
  await logAudit({
    actorId: actor.id,
    action: "BRANDING_UPDATED",
    module: "SETTINGS",
    entityType: "TenantBranding",
    entityId: row.id,
    previousValue: { ...previous },
    newValue: data,
  });
  return toBranding(row);
}

export async function resetBranding(actor: Actor) {
  const tenantId = assertTenantAdmin(actor);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  if (!tenant) throw notFound("Tenant not found");
  const previous = await getOrCreateBranding(tenantId);
  const defaults = { ...DEFAULT_BRANDING, companyName: tenant.name };
  const row = await prisma.tenantBranding.update({
    where: { tenantId },
    data: defaults,
  });
  await prisma.brandingAsset.deleteMany({ where: { tenantId } });
  await logAudit({
    actorId: actor.id,
    action: "BRANDING_RESET",
    module: "SETTINGS",
    entityType: "TenantBranding",
    entityId: row.id,
    previousValue: { ...previous },
    newValue: { ...defaults },
  });
  return toBranding(row);
}

/* ───────────── File uploads ───────────── */

export const ASSET_RULES = {
  LOGO: {
    maxBytes: 2 * 1024 * 1024,
    allowed: ["image/png", "image/jpeg", "image/webp" ],
  },
  FAVICON: { maxBytes: 256 * 1024, allowed: ["image/png", "image/x-icon"] },
} as const;

/** Detect type from magic bytes. The client-declared MIME is never trusted.
 *  SVG is deliberately NOT supported (script-injection risk). */
function sniffImage(b: Uint8Array): string | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50))
    return "image/webp";
  if (at(0, 0x00, 0x00, 0x01, 0x00)) return "image/x-icon";
  return null;
}

export async function uploadBrandingAsset(
  actor: Actor,
  kind: "LOGO" | "FAVICON",
  file: File,
) {
  const tenantId = assertTenantAdmin(actor);
  const rule = ASSET_RULES[kind];

  if (file.size === 0) throw new HttpError(400, "The file is empty");
  if (file.size > rule.maxBytes)
    throw new HttpError(
      413,
      `File is too large (max ${rule.maxBytes / 1024} KB)`,
    );

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime || !(rule.allowed as readonly string[]).includes(mime))
    throw new HttpError(
      415,
      `Unsupported file type. Allowed: ${rule.allowed.map((m) => m.split("/")[1]).join(", ")}`,
    );

  await getOrCreateBranding(tenantId);
  const asset = await prisma.brandingAsset.create({
    data: {
      tenantId,
      kind,
      mimeType: mime,
      sizeBytes: bytes.length,
      data: bytes,
    },
  });
  const url = `/api/branding/assets/${asset.id}`;
  const row = await prisma.tenantBranding.update({
    where: { tenantId },
    data: kind === "LOGO" ? { logoUrl: url } : { faviconUrl: url },
  });
  // Remove the tenant's previous file(s) of this kind.
  await prisma.brandingAsset.deleteMany({
    where: { tenantId, kind, id: { not: asset.id } },
  });
  await logAudit({
    actorId: actor.id,
    action: `BRANDING_${kind}_UPLOADED`,
    module: "SETTINGS",
    entityType: "BrandingAsset",
    entityId: asset.id,
    newValue: { mimeType: mime, sizeBytes: bytes.length },
  });
  return toBranding(row);
}
