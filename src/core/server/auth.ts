import { prisma } from "@/core/server/prisma";
import { requireAuth } from "@/core/server/session";

export async function getCurrentUser() {
  const authenticated = await requireAuth();
  return authenticated?.user ?? null;
}
