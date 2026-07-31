import type { NextRequest } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireAuth } from "@/core/server/session";
import { hasAnyRole, parseRole } from "@/core/utils/role";

export async function requireCommunicationUser(request?: NextRequest) {
  const authenticated = await requireAuth({ headers: request?.headers });
  if (!authenticated) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const, user: authenticated.user, role: parseRole(authenticated.user.role) };
}

export async function requireSupportAgent(request?: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return guard;
  if (!hasAnyRole(guard.role, ["content_manager"])) return { ok: false as const, status: 403, error: "Support staff role required" };
  return guard;
}

export function allowCommunicationAction(scope: string, userId: string, limit = 30, windowMs = 60_000) {
  return consumeRateLimit(`communications:${scope}:${userId}`, limit, windowMs);
}

export function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}
