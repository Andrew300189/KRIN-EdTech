import "server-only";
import { logAuthDiagnostic } from "@/core/server/auth-diagnostics";
import { isPlatformOwner } from "@/core/server/platform-owner";
import { requireAuth } from "@/core/server/session";
import { parseRole } from "@/core/utils/role";

type RequestWithHeaders = {
  headers: Headers;
};

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof requireAuth>>>["user"];

type PlatformOwnerGuardFailure = {
  ok: false;
  status: 401 | 403;
  error: "Unauthorized" | "Forbidden";
};

type PlatformOwnerGuardSuccess = {
  ok: true;
  user: AuthenticatedUser;
  role: ReturnType<typeof parseRole>;
};

export type PlatformOwnerGuard = PlatformOwnerGuardSuccess | PlatformOwnerGuardFailure;

/**
 * The single authorization boundary for CMS API routes and future CMS Server
 * Actions. It relies on the validated server session and the central owner
 * identity check; routes never compare owner emails themselves.
 */
export async function requirePlatformOwner(
  request?: RequestWithHeaders,
): Promise<PlatformOwnerGuard> {
  const authenticated = await requireAuth({ headers: request?.headers });
  if (!authenticated) {
    logAuthDiagnostic({ event: "cms_guard_result", result: "unauthorized" });
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!isPlatformOwner(authenticated.user.email)) {
    logAuthDiagnostic({ event: "cms_guard_result", result: "forbidden" });
    return { ok: false, status: 403, error: "Forbidden" };
  }

  logAuthDiagnostic({ event: "cms_guard_result", result: "allowed" });
  return {
    ok: true,
    user: authenticated.user,
    role: parseRole(authenticated.user.role),
  };
}
