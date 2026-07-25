import { NextRequest } from "next/server";
import { parseRole } from "@/core/utils/role";
import type { AppRole } from "@/core/constants/roles";
import { prisma } from "@/core/server/prisma";
import { getSessionUserId } from "@/core/server/session";

export type RequestIdentity = {
  userId: string;
  role: AppRole;
};

export async function getRequestIdentity(request: NextRequest): Promise<RequestIdentity> {
  const sessionUserId = await getSessionUserId();

  if (sessionUserId) {
    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true, role: true },
    });

    if (user) {
      return {
        userId: user.id,
        role: parseRole(user.role),
      };
    }
  }

  const userId = request.headers.get("x-user-id") ?? "demo-user";
  const roleHeader = request.headers.get("x-user-role");

  return {
    userId,
    role: parseRole(roleHeader),
  };
}
