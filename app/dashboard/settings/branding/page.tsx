import { redirect } from "next/navigation";

import { BrandingSettingsClient } from "@/components/branding-settings-client";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateBranding, resolveRequestTenantId } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function BrandingSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  const tenantId =
    (user as typeof user & { tenantId?: string | null }).tenantId ??
    (await resolveRequestTenantId());
  if (!tenantId) redirect("/dashboard");
  const branding = await getOrCreateBranding(tenantId);
  return <BrandingSettingsClient initial={branding} />;
}
