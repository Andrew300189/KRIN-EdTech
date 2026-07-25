import type { AppRole } from "@/core/constants/roles";

export function parseRole(value: string | null | undefined): AppRole {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "teacher" || normalized === "instructor") return "teacher";
  return "student";
}

export function hasAnyRole(currentRole: AppRole, allowed: AppRole[]): boolean {
  return allowed.includes(currentRole);
}
