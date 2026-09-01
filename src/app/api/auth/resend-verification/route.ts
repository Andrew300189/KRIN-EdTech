import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeVerificationEmail } from "@/core/server/email";
import { prisma } from "@/core/server/prisma";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { isTransactionalEmailConfigured } from "@/modules/communications/services/email.service";
import {
  createEmailVerificationToken,
  EMAIL_VERIFICATION_COOLDOWN_MS,
  EMAIL_VERIFICATION_TTL_MS,
  parseEmailVerificationRequest,
} from "@/modules/auth/services/email-verification.service";

export const runtime = "nodejs";

const GENERIC_RESPONSE = {
  success: true,
  message:
    "If an unverified account matches that email, a new confirmation link has been sent.",
};
const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();
  const expectedOrigin = new URL(configuredUrl || request.nextUrl.origin).origin;
  return Boolean(origin && origin === expectedOrigin);
}

function requestRateLimitKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  // Keep raw network metadata out of the in-memory limiter's keys.
  return createHash("sha256").update(ip).digest("hex");
}

function verificationUrl(request: NextRequest, token: string) {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();
  const baseUrl = configuredUrl ? new URL(configuredUrl) : request.nextUrl;
  if (process.env.NODE_ENV === "production" && !configuredUrl) {
    throw new Error("NEXTAUTH_URL must be set for email verification.");
  }
  if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") {
    throw new Error("NEXTAUTH_URL must use HTTPS in production.");
  }
  const url = new URL("/verify-email", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const rate = consumeRateLimit(
    `auth:resend-verification:${requestRateLimitKey(request)}`,
    REQUEST_LIMIT,
    REQUEST_WINDOW_MS,
  );
  if (!rate.allowed) {
    return NextResponse.json(GENERIC_RESPONSE, {
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseEmailVerificationRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!isTransactionalEmailConfigured()) {
    return NextResponse.json(
      { error: "Email delivery is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        emailVerificationSentAt: true,
        isBlocked: true,
        deletedAt: true,
        targetLanguage: true,
        learningGoal: true,
      },
    });

    if (!user || user.emailVerified || user.isBlocked || user.deletedAt) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const now = new Date();
    const cooldownBefore = new Date(
      now.getTime() - EMAIL_VERIFICATION_COOLDOWN_MS,
    );
    const { token, tokenHash } = createEmailVerificationToken();
    const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS);

    // A conditional write makes the cooldown and token replacement safe when
    // a user double-clicks or opens two browser tabs at the same time.
    const updated = await prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerified: false,
        OR: [
          { emailVerificationSentAt: null },
          { emailVerificationSentAt: { lt: cooldownBefore } },
        ],
      },
      data: {
        emailVerificationToken: tokenHash,
        emailVerificationSentAt: now,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    if (!updated.count) return NextResponse.json(GENERIC_RESPONSE);

    await sendWelcomeVerificationEmail({
      userId: user.id,
      name: user.name,
      email: user.email,
      verificationUrl: verificationUrl(request, token),
      verificationTokenHash: tokenHash,
      targetLanguage: user.targetLanguage,
      learningGoal: user.learningGoal,
    });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[auth/resend-verification] request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "We could not send a confirmation link right now. Please try again shortly." },
      { status: 500 },
    );
  }
}
