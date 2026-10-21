import { AuthForm } from "@/components/auth-form";
import { syncAuctionStatuses } from "@/lib/auction-lifecycle";

import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;

  // Run auction status sync in background without blocking
  syncAuctionStatuses().catch((e) => console.error("Auction sync error:", e));

  // Use static background image for fastest render - no database query needed
  const backgroundImages = [
    {
      id: "default",
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
    },
  ];

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
