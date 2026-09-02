import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { hashPassword, verifyPassword } from "@/core/server/password";
import { createSession } from "@/core/server/session";
import { sendWelcomeVerificationEmail } from "@/core/server/email";
import { getPostLoginPath } from "@/core/utils/workspace-path";
import { isTransactionalEmailConfigured } from "@/modules/communications/services/email.service";
import { recordFunnelEvent } from "@/modules/analytics/services/funnel.service";
import {
  createEmailVerificationToken,
  EMAIL_VERIFICATION_COOLDOWN_MS,
  EMAIL_VERIFICATION_TTL_MS,
} from "@/modules/auth/services/email-verification.service";
import {
  isUniqueConstraintError,
  validateRegistrationInput,
} from "@/modules/auth/services/registration-input.service";

export const runtime = "nodejs";

function requiresEmailVerification() {
  // Email confirmation becomes mandatory only after a sending domain is
  // configured. This keeps account creation usable while the platform is
  // being launched without a transactional email provider. When the Resend
  // domain is ready, set EMAIL_VERIFICATION_REQUIRED=true in Vercel.
  return process.env.EMAIL_VERIFICATION_REQUIRED === "true";
}

const VERIFICATION_MESSAGE =
  "Check your inbox and confirm your email address to activate your account.";

function logRegistrationIssue(
  step: "welcome-email" | "registration",
  error: unknown,
) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "UNKNOWN")
      : "UNKNOWN";
  console.error("[auth/register] non-sensitive failure", { step, code });
}

function verificationUrl(request: NextRequest, token: string) {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();
  const baseUrl = configuredUrl ? new URL(configuredUrl) : request.nextUrl;

  // Host headers are attacker-controlled behind a misconfigured proxy. A
  // production deployment must therefore supply its public canonical URL.
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

async function sendVerificationEmail(
  request: NextRequest,
  user: {
    id: string;
    name: string;
    email: string;
    targetLanguage?: string | null;
    learningGoal?: string | null;
  },
  token: string,
  tokenHash: string,
) {
  const delivery = await sendWelcomeVerificationEmail({
    userId: user.id,
    name: user.name,
    email: user.email,
    verificationUrl: verificationUrl(request, token),
    verificationTokenHash: tokenHash,
    targetLanguage: user.targetLanguage,
    learningGoal: user.learningGoal,
  });

  if (delivery.emailDelivery === "FAILED") {
    logRegistrationIssue("welcome-email", new Error("Email delivery failed"));
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid registration request" },
      { status: 400 },
    );
  }

  const validation = validateRegistrationInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const emailVerificationRequired = requiresEmailVerification();

  if (emailVerificationRequired && !isTransactionalEmailConfigured()) {
    // Do not create an account that is impossible to activate.
    return NextResponse.json(
      {
        error:
          "Registration is temporarily unavailable. Please try again shortly.",
        code: "EMAIL_DELIVERY_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  const { username, email, password } = validation.input;
  const now = new Date();

  try {
    const [emailOwner, usernameOwner] = await Promise.all([
      prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          passwordHash: true,
          role: true,
          emailVerified: true,
          emailVerificationSentAt: true,
          targetLanguage: true,
          learningGoal: true,
          isBlocked: true,
          deletedAt: true,
        },
      }),
      prisma.user.findUnique({
        where: { username },
        select: { id: true, email: true },
      }),
    ]);

    if (usernameOwner && usernameOwner.email !== email) {
      return NextResponse.json(
        {
          error:
            "An account with this email or username already exists. Please log in.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    if (emailOwner) {
      if (emailOwner.emailVerified || emailOwner.isBlocked || emailOwner.deletedAt) {
        return NextResponse.json(
          {
            error:
              "An account with this email or username already exists. Please log in.",
            code: "ACCOUNT_EXISTS",
          },
          { status: 409 },
        );
      }

      if (!emailVerificationRequired) {
        const ownsPendingAccount =
          emailOwner.username === username &&
          verifyPassword(password, emailOwner.passwordHash);
        if (!ownsPendingAccount) {
          return NextResponse.json(
            {
              error:
                "An account with this email or username already exists. Please log in.",
              code: "ACCOUNT_EXISTS",
            },
            { status: 409 },
          );
        }

        await prisma.user.update({
          where: { id: emailOwner.id },
          data: {
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationSentAt: null,
            emailVerificationExpiresAt: null,
          },
        });
        await createSession(emailOwner.id, { headers: request.headers });

        return NextResponse.json({
          success: true,
          requiresEmailVerification: false,
          user: {
            id: emailOwner.id,
            username: emailOwner.username,
            email: emailOwner.email,
            name: emailOwner.name,
            role: emailOwner.role.toLowerCase(),
            workspacePath: getPostLoginPath(emailOwner.email, emailOwner.role),
            emailVerified: true,
          },
        });
      }

      const sentRecently =
        emailOwner.emailVerificationSentAt &&
        now.getTime() - emailOwner.emailVerificationSentAt.getTime() <
          EMAIL_VERIFICATION_COOLDOWN_MS;
      if (!sentRecently) {
        const { token, tokenHash } = createEmailVerificationToken();
        const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS);
        const updated = await prisma.user.updateMany({
          where: { id: emailOwner.id, emailVerified: false },
          data: {
            emailVerificationToken: tokenHash,
            emailVerificationSentAt: now,
            emailVerificationExpiresAt: expiresAt,
          },
        });
        if (updated.count) {
          await sendVerificationEmail(request, emailOwner, token, tokenHash);
        }
      }

      return NextResponse.json({
        success: true,
        requiresEmailVerification: true,
        message: VERIFICATION_MESSAGE,
      });
    }

    const verification = emailVerificationRequired
      ? createEmailVerificationToken()
      : null;
    const expiresAt = emailVerificationRequired
      ? new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS)
      : null;

    let user;
    try {
      user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hashPassword(password),
          name: username,
          role: "STUDENT",
          emailVerified: !emailVerificationRequired,
          emailVerificationToken: verification?.tokenHash ?? null,
          emailVerificationSentAt: emailVerificationRequired ? now : null,
          emailVerificationExpiresAt: expiresAt,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          targetLanguage: true,
          learningGoal: true,
        },
      });
    } catch (error) {
      // The database unique constraint remains authoritative when two requests
      // race after the lookup above.
      if (isUniqueConstraintError(error)) {
        return NextResponse.json(
          {
            error:
              "An account with this email or username already exists. Please log in.",
            code: "ACCOUNT_EXISTS",
          },
          { status: 409 },
        );
      }
      throw error;
    }

    if (emailVerificationRequired && verification) {
      await sendVerificationEmail(
        request,
        user,
        verification.token,
        verification.tokenHash,
      );
    } else {
      await createSession(user.id, { headers: request.headers });
    }

    void recordFunnelEvent({
      eventId: `signup-complete:${user.id}`,
      eventType: "SIGNUP_COMPLETE",
      pagePath: "/register",
      userId: user.id,
      result: "SUCCEEDED",
    }).catch(() => undefined);

    if (emailVerificationRequired) {
      return NextResponse.json(
        {
          success: true,
          requiresEmailVerification: true,
          message: VERIFICATION_MESSAGE,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        requiresEmailVerification: false,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role.toLowerCase(),
          workspacePath: getPostLoginPath(user.email, user.role),
          emailVerified: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error:
            "An account with this email or username already exists. Please log in.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    logRegistrationIssue("registration", error);
    return NextResponse.json(
      {
        error:
          "We could not complete registration right now. Please try again shortly.",
        code: "REGISTRATION_UNAVAILABLE",
      },
      { status: 500 },
    );
  }
}
