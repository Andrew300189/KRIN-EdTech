import { prisma } from "@/core/server/prisma";
import { getServerSession } from "next-auth";
import { nextAuthOptions } from "@/core/server/next-auth";
import { AUTHENTICATED_USER_SELECT, requireAuth } from "@/core/server/session";

export async function getCurrentUser() {
  const authenticated = await requireAuth();
  if (authenticated) return authenticated.user;

  // Google OAuth uses the NextAuth JWT session. getServerSession is the same
  // verified path used by /auth/complete, so this covers a NextAuth request
  // even if a legacy application-session cookie is present or expired.
  const session = await getServerSession(nextAuthOptions);
  const userId = session?.user.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: AUTHENTICATED_USER_SELECT,
  });
  return user && !user.deletedAt && !user.isBlocked && user.emailVerified
    ? user
    : null;
}
