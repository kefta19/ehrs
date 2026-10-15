import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground px-5 py-12 transition-colors">
      <div className="w-full max-w-md">
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
