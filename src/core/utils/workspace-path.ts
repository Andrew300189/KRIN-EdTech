import { parseRole } from "@/core/utils/role";
import { getSafeInternalPath } from "@/core/utils/safe-internal-path";
import { canAccessCms } from "@/core/access/cms-access";
import { isPlatformOwner } from "@/core/server/platform-owner";

export function hasCmsAccess(
  email: string | null | undefined,
  role: string | null | undefined,
) {
  return canAccessCms(email, role);
}

/**
 * The only resolver for the first destination after a successful login.
 * Owner identity deliberately wins over every database role: the owner may
 * retain the ordinary STUDENT role without being sent to /student.
 */
export function resolvePostAuthDestination(
  email: string | null | undefined,
  role?: string | null | undefined,
) {
  if (isPlatformOwner(email)) return "/cms";

  return resolveDashboardByRole(role);
}

/** @deprecated Use resolvePostAuthDestination for new authentication flows. */
export function getUserWorkspacePath(
  email: string | null | undefined,
  role?: string | null | undefined,
) {
  return resolvePostAuthDestination(email, role);
}

/**
 * Resolves a non-owner's personal workspace. CMS guards must use this helper
 * instead of the post-auth resolver so a managed CMS role cannot loop back to
 * a route that has explicitly been restricted to the platform owner.
 */
export function resolveDashboardByRole(role: string | null | undefined) {
  return parseRole(role) === "teacher" ? "/teacher" : "/student";
}

export function getRoleWorkspacePath(role: string | null | undefined) {
  switch (parseRole(role)) {
    case "teacher":
      return "/teacher";
    case "content_manager":
    case "admin":
    case "super_admin":
      return "/admin";
    default:
      return "/student";
  }
}

/** Keeps a safe callback only when it belongs to the current user's workspace. */
export function getPostLoginPath(
  email: string | null | undefined,
  role: string | null | undefined,
  requestedPath?: string | null,
) {
  const workspace = resolvePostAuthDestination(email, role);
  const candidate = getSafeInternalPath(requestedPath, workspace);

  if (candidate === "/dashboard" || candidate.startsWith("/dashboard/")) {
    return workspace;
  }

  if (candidate === "/student" || candidate.startsWith("/student/")) {
    return workspace === "/student" ? candidate : workspace;
  }

  if (candidate === "/teacher" || candidate.startsWith("/teacher/")) {
    return workspace === "/teacher" ? candidate : workspace;
  }

  if (candidate === "/admin" || candidate.startsWith("/admin/")) {
    return workspace === "/cms" ? candidate : workspace;
  }

  if (candidate === "/cms" || candidate.startsWith("/cms/")) {
    return workspace === "/cms" ? candidate : workspace;
  }

  return candidate;
}
