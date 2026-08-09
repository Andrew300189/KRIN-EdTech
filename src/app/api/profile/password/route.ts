import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/core/server/password";
import { prisma } from "@/core/server/prisma";
import { requireAuth } from "@/core/server/session";
import { validateNewPassword } from "@/modules/auth/services/password-reset.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authenticated = await requireAuth();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid password change request." }, { status: 400 });
  }

  const validation = validateNewPassword(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  const currentPassword = typeof values.currentPassword === "string" ? values.currentPassword : "";
  const isFreshGoogleSession = authenticated.session.sessionId.startsWith("nextauth:");

  try {
    const user = await prisma.user.findUnique({
      where: { id: authenticated.user.id },
      select: { id: true, passwordHash: true, isBlocked: true, deletedAt: true },
    });
    if (!user || user.isBlocked || user.deletedAt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // A current Google OAuth session is proof of possession of the linked
    // account, allowing Google-only users to establish their first password.
    // Password-session users must confirm their existing password.
    if (!isFreshGoogleSession && (!currentPassword || !verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Enter your current password to change it." }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashPassword(validation.password),
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
          passwordResetRequestedAt: null,
        },
      }),
      prisma.session.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date(), revokedReason: "password_changed" },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Password updated. You can use email and password next time." });
  } catch (error) {
    console.error("[profile/password] change failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Unable to update password. Please try again." },
      { status: 500 },
    );
  }
}
