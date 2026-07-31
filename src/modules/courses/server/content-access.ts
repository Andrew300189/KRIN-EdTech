import type { NextRequest } from "next/server";
import { parseRole, hasAnyRole } from "@/core/utils/role";
import { requireAuth } from "@/core/server/session";

export async function requireContentManager(request?: NextRequest) {
  const authenticated = await requireAuth({ headers: request?.headers });
  if (!authenticated) return { ok: false as const, status: 401, error: "Unauthorized" };

  const role = parseRole(authenticated.user.role);
  if (!hasAnyRole(role, ["content_manager"])) {
    return { ok: false as const, status: 403, error: "Content manager role required" };
  }

  return { ok: true as const, user: authenticated.user, role };
}

export async function requireLearningUser(request?: NextRequest) {
  const authenticated = await requireAuth({ headers: request?.headers });
  if (!authenticated) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const, user: authenticated.user };
}
