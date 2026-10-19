import { VerifyAccountEmail } from "@/components/verify-account-email";

export const dynamic = "force-dynamic";

export default async function VerifyAccountEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyAccountEmail token={token ?? ""} />;
}
