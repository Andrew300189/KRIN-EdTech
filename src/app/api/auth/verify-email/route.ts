import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import {
  hashEmailVerificationToken,
  parseEmailVerificationSubmission,
} from "@/modules/auth/services/email-verification.service";

export const runtime = "nodejs";

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();
  const expectedOrigin = new URL(configuredUrl || request.nextUrl.origin).origin;
  return Boolean(origin && origin === expectedOrigin);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseEmailVerificationSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const tokenHash = hashEmailVerificationToken(parsed.token);
  const now = new Date();

  try {
    // The same predicate is used for lookup and consumption. updateMany is
    // atomic, so only one simultaneous request can redeem a link.
    const activated = await prisma.user.updateMany({
      where: {
        emailVerified: false,
        emailVerificationToken: tokenHash,
        emailVerificationExpiresAt: { gt: now },
        isBlocked: false,
        deletedAt: null,
      },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationSentAt: null,
        emailVerificationExpiresAt: null,
      },
    });

    if (!activated.count) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified. You can now sign in.",
    });
  } catch (error) {
    console.error("[auth/verify-email] verification failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "We could not verify this email right now. Please try again shortly." },
      { status: 500 },
    );
  }
}
