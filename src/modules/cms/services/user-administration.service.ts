import "server-only";

import { prisma } from "@/core/server/prisma";
import { isPlatformOwner } from "@/core/server/platform-owner";

export class UserAdministrationError extends Error {
  constructor(message: string, readonly status: 400 | 404) {
    super(message);
  }
}

/**
 * User data participates in payments, learning records and audit trails.
 * Therefore CMS "delete" is an auditable, reversible account archive rather
 * than a destructive database delete.
 */
export async function archiveUserFromCms(actorId: string, targetUserId: string) {
  if (actorId === targetUserId) {
    throw new UserAdministrationError("You cannot delete the account currently used to manage the platform.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, deletedAt: true },
    });
    if (!target) throw new UserAdministrationError("User not found.", 404);
    if (isPlatformOwner(target.email)) {
      throw new UserAdministrationError("The platform owner account cannot be deleted from CMS.", 400);
    }
    if (target.deletedAt) {
      throw new UserAdministrationError("This user is already deleted.", 400);
    }

    const now = new Date();
    await tx.user.update({
      where: { id: target.id },
      data: { isBlocked: true, deletedAt: now, showInLeaderboard: false },
    });
    const revokedSessions = await tx.session.updateMany({
      where: { userId: target.id, isRevoked: false },
      data: { isRevoked: true, revokedAt: now, revokedReason: "cms_user_deleted" },
    });
    await tx.contentAuditLog.create({
      data: {
        actorId,
        action: "USER_ARCHIVED",
        entityType: "User",
        entityId: target.id,
        metadata: { revokedSessions: revokedSessions.count },
      },
    });
    return { id: target.id, revokedSessions: revokedSessions.count };
  });
}

export async function restoreUserFromCms(actorId: string, targetUserId: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: targetUserId }, select: { id: true, deletedAt: true } });
    if (!target) throw new UserAdministrationError("User not found.", 404);
    if (!target.deletedAt) throw new UserAdministrationError("This user is active.", 400);
    await tx.user.update({ where: { id: target.id }, data: { isBlocked: false, deletedAt: null } });
    await tx.contentAuditLog.create({ data: { actorId, action: "USER_RESTORED", entityType: "User", entityId: target.id } });
    return { id: target.id };
  });
}
