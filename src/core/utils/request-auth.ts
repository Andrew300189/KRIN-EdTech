import { NextRequest } from "next/server";
import { parseRole } from "@/core/utils/role";
import type { AppRole } from "@/core/constants/roles";
import { requireAuth } from "@/core/server/session";

export type RequestIdentity = {
  userId: string;
  role: AppRole;
};

export async function getRequestIdentity(
  request: NextRequest,
): Promise<RequestIdentity | null> {
  const authenticated = await requireAuth({ headers: request.headers });
  if (!authenticated) return null;

  return {
    userId: authenticated.user.id,
    role: parseRole(authenticated.user.role),
  };
}
