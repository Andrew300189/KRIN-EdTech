import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/core/server/password";
import { prisma } from "@/core/server/prisma";
import {
  hashPasswordResetToken,
  parsePasswordResetSubmission,
} from "@/modules/auth/services/password-reset.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid password reset request." }, { status: 400 });
  }

  const parsed = parsePasswordResetSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(parsed.token);
  const now = new Date();

  try {
    const changed = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { gt: now },
          isBlocked: false,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!user) return false;

      // Keep the token predicate in the update as well: a reset link can be
      // replaced by a newer request between the read and the write.
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { gt: now },
        },
        data: {
          passwordHash: hashPassword(parsed.password),
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
          passwordResetRequestedAt: null,
        },
      });

      if (!updated.count) return false;

      await tx.session.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true, revokedAt: now, revokedReason: "password_reset" },
      });

      return true;
    });

    if (!changed) {
      return NextResponse.json(
        { error: "This password-reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (error) {
    console.error("[auth/reset-password] reset failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "We could not reset your password right now. Please try again shortly." },
      { status: 500 },
    );
  }
}
