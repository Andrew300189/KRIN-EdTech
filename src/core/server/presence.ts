import { prisma } from "@/core/server/prisma";

/** A visible authenticated client is online for two minutes after its last heartbeat. */
export const PRESENCE_ONLINE_WINDOW_MS = 2 * 60 * 1000;
const PRESENCE_WRITE_INTERVAL_MS = 45 * 1000;

export type UserPresence = "ONLINE" | "OFFLINE";

export function getUserPresence(lastActiveAt: Date | null | undefined, now = new Date()): UserPresence {
  if (!lastActiveAt) return "OFFLINE";
  return now.getTime() - lastActiveAt.getTime() <= PRESENCE_ONLINE_WINDOW_MS
    ? "ONLINE"
    : "OFFLINE";
}

/**
 * Persist one activity timestamp at most once per 45 seconds. This is enough
 * for a two-minute presence window without writing on every UI render.
 */
export async function touchUserPresence(userId: string, now = new Date()) {
  const staleBefore = new Date(now.getTime() - PRESENCE_WRITE_INTERVAL_MS);

  return prisma.user.updateMany({
    where: {
      id: userId,
      deletedAt: null,
      isBlocked: false,
      OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: staleBefore } }],
    },
    data: { lastActiveAt: now },
  });
}
