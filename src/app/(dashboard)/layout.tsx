import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { hasCmsAccess } from "@/core/utils/workspace-path";
import { DashboardLayoutClient } from "./DashboardLayoutClient";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await requireAuth();
  if (!authenticated) {
    redirect("/login?reason=session_required&next=/dashboard");
  }

  return (
    <DashboardLayoutClient showCmsLink={hasCmsAccess(authenticated.user.email, authenticated.user.role)}>
      {children}
    </DashboardLayoutClient>
  );
}
