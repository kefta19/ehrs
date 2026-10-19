import ProviderPage from "@/app/provider/page";

export const dynamic = "force-dynamic";

export default function SellerPage(props: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  return ProviderPage(props);
}
