import { redirect } from "next/navigation";
import BillingPage from "@/app/(dashboard)/dashboard/billing/page";
import { requireRole } from "@/core/server/role-guard";
import { getRoleWorkspacePath } from "@/core/utils/workspace-path";

/** Reuses the verified checkout UI while applying the canonical student guard. */
export default async function StudentBillingPage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) redirect(guard.status === 401 ? "/login?reason=session_required" : getRoleWorkspacePath(guard.role));
  return <BillingPage />;
}
