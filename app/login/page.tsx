import { AuthForm } from "@/components/auth-form";
import { AuthImagePanel } from "@/components/auth-image-panel";
import { syncAuctionStatuses } from "@/lib/auction-lifecycle";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;

  // Run auction status sync in background without blocking
  syncAuctionStatuses().catch((e) => console.error("Auction sync error:", e));

  return (
    <main className="h-screen max-h-screen overflow-hidden flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-foreground transition-colors">
      {/* Left side: Modern and Attractive Home Image */}
      <div className="hidden lg:flex lg:w-1/2 h-full">
        <AuthImagePanel mode="login" />
      </div>

      {/* Right side: Login Form (No internal scroll) */}
      <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-4 sm:p-8 xl:p-12">
        <div className="w-full max-w-md">
          <AuthForm mode="login" redirectUrl={redirect} googleError={error} />
        </div>
      </div>
    </main>
  );
}
