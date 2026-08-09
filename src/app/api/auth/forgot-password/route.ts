import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/core/server/email";
import { prisma } from "@/core/server/prisma";
import {
  createPasswordResetToken,
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TTL_MS,
  parsePasswordResetRequest,
} from "@/modules/auth/services/password-reset.service";

export const runtime = "nodejs";

const GENERIC_RESPONSE = {
  success: true,
  message: "If an active account matches that email, a reset link has been sent.",
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid password reset request." }, { status: 400 });
  }

  const parsed = parsePasswordResetRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
        deletedAt: true,
        passwordResetRequestedAt: true,
      },
    });

    if (!user || user.isBlocked || user.deletedAt) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const now = new Date();
    const requestedRecently = user.passwordResetRequestedAt
      && now.getTime() - user.passwordResetRequestedAt.getTime() < PASSWORD_RESET_COOLDOWN_MS;
    if (requestedRecently) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const { token, tokenHash } = createPasswordResetToken();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
        passwordResetRequestedAt: now,
      },
    });

    const resetUrl = new URL("/reset-password", request.nextUrl.origin);
    resetUrl.searchParams.set("token", token);

    try {
      await sendPasswordResetEmail({
        userId: user.id,
        name: user.name,
        email: user.email,
        resetUrl: resetUrl.toString(),
      });
    } catch (error) {
      // Account enumeration and reset credentials must never be written to the
      // response or log. Delivery failures are observable through the existing
      // notification-delivery records.
      console.error("[auth/forgot-password] reset email delivery failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[auth/forgot-password] request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "We could not start password reset right now. Please try again shortly." },
      { status: 500 },
    );
  }
}
