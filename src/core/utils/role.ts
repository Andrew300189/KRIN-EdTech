import type { AppRole } from "@/core/constants/roles";

export function parseRole(value: string | null | undefined): AppRole {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "super_admin") return "super_admin";
  if (normalized === "admin") return "admin";
  if (normalized === "content_manager") return "content_manager";
  // Accept the pre-rename value only for already-issued sessions. New users and
  // database records use the canonical TEACHER role after the Prisma migration.
  if (normalized === "teacher" || normalized === "instructor") return "teacher";
  return "student";
}

export function hasAnyRole(currentRole: AppRole, allowed: AppRole[]): boolean {
  const rank: Record<AppRole, number> = {
    student: 0,
    teacher: 1,
    content_manager: 2,
    admin: 3,
    super_admin: 4,
  };

  return allowed.some((role) => rank[currentRole] >= rank[role]);
}
