import { NextRequest } from "next/server";
import { parseRole } from "@/core/utils/role";
import type { AppRole } from "@/core/constants/roles";

export type RequestIdentity = {
  userId: string;
  role: AppRole;
};

export function getRequestIdentity(request: NextRequest): RequestIdentity {
  const userId = request.headers.get("x-user-id") ?? "demo-user";
  const roleHeader = request.headers.get("x-user-role");

  return {
    userId,
    role: parseRole(roleHeader),
  };
}
