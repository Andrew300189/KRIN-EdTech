import { redirect } from "next/navigation";
import { logAuthDiagnostic } from "@/core/server/auth-diagnostics";
import { isPlatformOwner } from "@/core/server/platform-owner";
import { requireAuth } from "@/core/server/session";
import { resolveDashboardByRole } from "@/core/utils/workspace-path";
import { CmsNavigation } from "@/modules/cms/components/CmsNavigation";
import { CmsBreadcrumbs } from "@/modules/cms/components/CmsBreadcrumbs";

/**
 * Server-side CMS boundary. Middleware is an early routing optimization; this
 * layout remains the authoritative check for every rendered CMS request.
 */
export default async function CmsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authenticated = await requireAuth();

  if (!authenticated) {
    logAuthDiagnostic({ event: "cms_guard_result", result: "unauthorized" });
    redirect("/login?callbackUrl=/cms");
  }

  if (!isPlatformOwner(authenticated.user.email)) {
    logAuthDiagnostic({ event: "cms_guard_result", result: "forbidden" });
    redirect(resolveDashboardByRole(authenticated.user.role));
  }

  logAuthDiagnostic({ event: "cms_guard_result", result: "allowed" });
  return <div className="min-h-screen bg-slate-50"><CmsNavigation /><CmsBreadcrumbs /><main className="mx-auto max-w-7xl px-6 py-8">{children}</main></div>;
}
