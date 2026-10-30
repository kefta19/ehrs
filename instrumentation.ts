export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const g = globalThis as unknown as {
      __auctionSweepInterval?: NodeJS.Timeout;
    };
    if (g.__auctionSweepInterval) return;

    const { syncAuctionStatuses } = await import("@/lib/auction-lifecycle");

    // Run initial sync in background after a delay to not block startup
    setTimeout(() => {
      syncAuctionStatuses().catch((err) => {
        console.error("[Instrumentation] Initial auction sync failed:", err);
      });
    }, 5000);

    // Schedule background sync every 30 seconds with singleton guard
    g.__auctionSweepInterval = setInterval(async () => {
      try {
        await syncAuctionStatuses();
      } catch (err) {
        console.error("[Instrumentation] Background auction sync failed:", err);
      }
    }, 30_000);
  }
}
