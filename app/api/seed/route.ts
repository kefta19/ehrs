import { prisma } from "@/lib/prisma";
import { DEFAULT_BRANDING, DEFAULT_TENANT_SLUG } from "@/lib/branding-shared";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Starting seed...");

    // Create default tenant
    const defaultTenant = await prisma.tenant.upsert({
      where: { slug: DEFAULT_TENANT_SLUG },
      update: {},
      create: {
        slug: DEFAULT_TENANT_SLUG,
        name: DEFAULT_BRANDING.companyName,
        isDefault: true,
        isActive: true,
      },
    });
    console.log("✓ Default tenant created:", defaultTenant.id);

    // Create default branding
    await prisma.tenantBranding.upsert({
      where: { tenantId: defaultTenant.id },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        ...DEFAULT_BRANDING,
      },
    });
    console.log("✓ Default branding created");

    return NextResponse.json({ success: true, message: "Database seeded successfully" });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json({ success: false, error: String(error), details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
