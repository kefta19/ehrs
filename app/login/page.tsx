import { AuthForm } from "@/components/auth-form";
import { prisma } from "@/lib/prisma";
import { syncAuctionStatuses } from "@/lib/auction-lifecycle";

import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;
  await syncAuctionStatuses();

  const liveAuctions = await prisma.auction.findMany({
    where: {
      status: "ACTIVE",
      listing: { images: { some: {} } },
    },
    select: {
      id: true,
      listing: {
        select: {
          images: {
            select: { url: true },
            orderBy: { displayOrder: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const backgroundImages = liveAuctions.flatMap((auction) => {
    const image = auction.listing.images[0];
    return image ? [{ id: auction.id, url: image.url }] : [];
  });

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#0A192F] px-5 py-12 text-foreground transition-colors">
      {backgroundImages.length > 0 && (
        <div aria-hidden="true" className={styles.background}>
          <div className={styles.track}>
            {[...backgroundImages, ...backgroundImages].map((image, index) => (
              <div className={styles.slide} key={`${image.id}-${index}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className={styles.image}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
            ))}
          </div>
          <div className={styles.scrim} />
        </div>
      )}
      <div className="relative z-10 w-full max-w-md">
        <AuthForm mode="login" redirectUrl={redirect} googleError={error} />
      </div>
    </main>
  );
}
