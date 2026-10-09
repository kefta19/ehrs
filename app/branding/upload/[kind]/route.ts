import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import {
  ASSET_RULES,
  assertTenantAdmin,
  uploadBrandingAsset,
} from "@/lib/branding";
import { handle, HttpError, notFound } from "@/lib/http";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export function POST(
  request: NextRequest,
  ctx: { params: Promise<{ kind: string }> },
) {
  return handle(async () => {
    const { kind } = await ctx.params;
    if (kind !== "logo" && kind !== "favicon") throw notFound();
    const assetKind = kind === "logo" ? "LOGO" : "FAVICON";

    const user = await requireAuth();
    assertTenantAdmin(user); // permission check BEFORE reading the body

    if (!rateLimit(`branding-upload:${user.id}`, 20, 60_000))
      throw new HttpError(429, "Too many uploads. Please wait a minute.");

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > ASSET_RULES[assetKind].maxBytes + 64 * 1024)
      throw new HttpError(413, "File is too large");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file uploaded");

    const branding = await uploadBrandingAsset(user, assetKind, file);
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, branding });
  });
}
