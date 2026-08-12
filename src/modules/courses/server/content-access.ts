import type { NextRequest } from "next/server";
import { requireAuth } from "@/core/server/session";

export async function requireLearningUser(request?: NextRequest) {
  const authenticated = await requireAuth({ headers: request?.headers });
  if (!authenticated)
    return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const, user: authenticated.user };
}
