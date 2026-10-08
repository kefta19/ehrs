import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardRedirect() {
  const user = await getCurrentUser();
  redirect(user ? roleHome(user.role) : "/login");
}
