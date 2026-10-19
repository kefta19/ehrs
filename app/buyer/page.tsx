import CustomerPage from "@/app/customer/page";

export const dynamic = "force-dynamic";

export default function BuyerPage(props: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  return CustomerPage(props);
}

