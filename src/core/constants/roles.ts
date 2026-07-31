export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  CONTENT_MANAGER: "content_manager",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<AppRole, string> = {
  [ROLES.STUDENT]: "Student",
  [ROLES.TEACHER]: "Teacher",
  [ROLES.CONTENT_MANAGER]: "Content manager",
  [ROLES.ADMIN]: "Admin",
  [ROLES.SUPER_ADMIN]: "Super admin",
};
