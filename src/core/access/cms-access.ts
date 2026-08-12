import type { AppRole } from "@/core/constants/roles";
import { PLATFORM_CMS_ACCESS_MODE } from "@/core/constants/platform";
import { isPlatformOwner } from "@/core/server/platform-owner";
import { parseRole } from "@/core/utils/role";

export const PLATFORM_ACCESS_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  CONTENT_MANAGER: "CONTENT_MANAGER",
  SUPPORT: "SUPPORT",
} as const;

export type PlatformAccessRole =
  (typeof PLATFORM_ACCESS_ROLES)[keyof typeof PLATFORM_ACCESS_ROLES];

const APP_ROLE_TO_PLATFORM_ACCESS: Partial<
  Record<AppRole, readonly PlatformAccessRole[]>
> = {
  super_admin: [PLATFORM_ACCESS_ROLES.ADMIN],
  admin: [PLATFORM_ACCESS_ROLES.ADMIN],
  content_manager: [PLATFORM_ACCESS_ROLES.CONTENT_MANAGER],
};

export function getPlatformAccessRoles(
  email: string | null | undefined,
  role: string | null | undefined,
) {
  const roles: PlatformAccessRole[] = [];

  if (isPlatformOwner(email)) {
    roles.push(PLATFORM_ACCESS_ROLES.OWNER);
  }

  const mapped = APP_ROLE_TO_PLATFORM_ACCESS[parseRole(role)] ?? [];
  for (const item of mapped) {
    if (!roles.includes(item)) roles.push(item);
  }

  return roles;
}

export function canAccessCms(
  email: string | null | undefined,
  role: string | null | undefined,
) {
  const roles = getPlatformAccessRoles(email, role);
  if (roles.includes(PLATFORM_ACCESS_ROLES.OWNER)) return true;

  if (PLATFORM_CMS_ACCESS_MODE === "owner_and_roles") {
    return roles.some((item) => item !== PLATFORM_ACCESS_ROLES.OWNER);
  }

  return false;
}
