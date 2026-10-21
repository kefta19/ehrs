const { PrismaClient } = require("../app/generated/prisma/client/index.js");
const { PrismaNeon } = require("@prisma/adapter-neon");
require("dotenv/config");

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database seed...");

  // Default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      slug: "default",
      name: "ETAuction",
      isDefault: true,
      isActive: true,
    },
  });
  console.log("✓ Default tenant created");

  // Default branding
  await prisma.tenantBranding.upsert({
    where: { tenantId: defaultTenant.id },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      companyName: "ETAuction",
      primaryColor: "#2563EB",
      secondaryColor: "#0F172A",
      backgroundColor: "#F8FAFC",
      textColor: "#1E293B",
    },
  });
  console.log("✓ Default branding created");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
