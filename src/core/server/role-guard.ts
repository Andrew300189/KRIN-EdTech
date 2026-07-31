import type { NextRequest } from "next/server";
import type { AppRole } from "@/core/constants/roles";
import { requireAuth } from "@/core/server/session";
import { parseRole } from "@/core/utils/role";

export type Permission =
  | "student:learn"
  | "teacher:dashboard"
  | "teacher:groups"
  | "teacher:assignments"
  | "teacher:reviews"
  | "teacher:analytics"
  | "admin:manage";

const PERMISSION_ROLES: Record<Permission, readonly AppRole[]> = {
  "student:learn": ["student"],
  "teacher:dashboard": ["teacher"],
  "teacher:groups": ["teacher"],
  "teacher:assignments": ["teacher"],
  "teacher:reviews": ["teacher"],
  "teacher:analytics": ["teacher"],
  "admin:manage": ["content_manager", "admin", "super_admin"],
};

type GuardFailure = {
  ok: false;
  status: 401 | 403;
  error: "Unauthorized" | "Forbidden";
  role?: AppRole;
};

/**
 * Exact role checks for application workspaces. Unlike rank-based display
 * helpers, this never turns a teacher into an administrator implicitly.
 */
export async function requireRole(
  allowedRoles: readonly AppRole[],
  request?: NextRequest,
) {
  const authenticated = await requireAuth({ headers: request?.headers });
  if (!authenticated) {
    return { ok: false, status: 401, error: "Unauthorized" } as const satisfies GuardFailure;
  }

  const role = parseRole(authenticated.user.role);
  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, error: "Forbidden", role } as const satisfies GuardFailure;
  }

  return { ok: true as const, role, user: authenticated.user };
}

export function hasPermission(role: AppRole, permission: Permission) {
  return PERMISSION_ROLES[permission].includes(role);
}

export async function requirePermission(
  permission: Permission,
  request?: NextRequest,
) {
  return requireRole(PERMISSION_ROLES[permission], request);
}
