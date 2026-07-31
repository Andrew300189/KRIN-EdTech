import { parseRole } from "@/core/utils/role";
import { getSafeInternalPath } from "@/core/utils/safe-internal-path";

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

/** Keeps a safe callback only when it belongs to the current role's workspace. */
export function getPostLoginPath(
  role: string | null | undefined,
  requestedPath?: string | null,
) {
  const workspace = getRoleWorkspacePath(role);
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
    return workspace === "/admin" ? candidate : workspace;
  }

  return candidate;
}
