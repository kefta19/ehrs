import { AuthForm } from "@/components/auth-form";
import { AuthImagePanel } from "@/components/auth-image-panel";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="h-screen max-h-screen overflow-hidden flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-foreground transition-colors">
      {/* Left side: Modern and Attractive Home Image */}
      <div className="hidden lg:flex lg:w-1/2 h-full">
        <AuthImagePanel mode="register" />
      </div>

      {/* Right side: Register Form (No internal scroll) */}
      <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-4 sm:p-8 xl:p-12">
        <div className="w-full max-w-lg sm:max-w-xl">
          <AuthForm mode="register" googleError={error} />
        </div>
      </div>
    </main>
  );
}
