import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import {
  getRequestBranding,
  resetBranding,
  resolveRequestTenantId,
  updateBranding,
} from "@/lib/branding";
import { handle, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

// Branding of the caller's tenant (session) or of the host's tenant (public pages).
export function GET() {
  return handle(async () =>
    NextResponse.json({ success: true, branding: await getRequestBranding() }),
  );
}

export function PUT(request: NextRequest) {
  return handle(async () => {
    const user = await requireAuth();
    if (!user.tenantId) {
      const defId = await resolveRequestTenantId();
      if (defId) (user as unknown as { tenantId?: string | null }).tenantId = defId;
    }
    const body = await request.json().catch(() => {
      throw new HttpError(400, "Invalid JSON body");
    });
    const branding = await updateBranding(user, body);
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, branding });
  });
}

export function DELETE() {
  return handle(async () => {
    const user = await requireAuth();
    if (!user.tenantId) {
      const defId = await resolveRequestTenantId();
      if (defId) (user as unknown as { tenantId?: string | null }).tenantId = defId;
    }
    const branding = await resetBranding(user);
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, branding });
  });
}
