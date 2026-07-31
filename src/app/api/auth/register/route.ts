import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { hashPassword } from "@/core/server/password";
import { createSession } from "@/core/server/session";
import { sendWelcomeVerificationEmail } from "@/core/server/email";
import {
  isUniqueConstraintError,
  validateRegistrationInput,
} from "@/modules/auth/services/registration-input.service";

export const runtime = "nodejs";

function logRegistrationIssue(step: "session" | "welcome-email" | "registration", error: unknown) {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "UNKNOWN")
    : "UNKNOWN";
  console.error("[auth/register] non-sensitive failure", { step, code });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid registration request" }, { status: 400 });
  }

  const validation = validateRegistrationInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { username, email, password } = validation.input;

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "An account with this email or username already exists. Please log in.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    const verificationToken = randomBytes(32).toString("hex");
    const verificationTokenHash = createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    let user;
    try {
      user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hashPassword(password),
          name: username,
          role: "STUDENT",
          emailVerificationToken: verificationTokenHash,
          emailVerificationSentAt: new Date(),
        },
      });
    } catch (error) {
      // A second request can pass the pre-check while the first one is creating
      // the account. The database unique constraint is the final authority.
      if (isUniqueConstraintError(error)) {
        return NextResponse.json(
          {
            error: "An account with this email or username already exists. Please log in.",
            code: "ACCOUNT_EXISTS",
          },
          { status: 409 },
        );
      }
      throw error;
    }

    let autoLogin = true;
    try {
      await createSession(user.id, { headers: request.headers });
    } catch (error) {
      // The account is valid even if a cookie could not be created. Returning a
      // successful result avoids a misleading retry that would report a duplicate.
      autoLogin = false;
      logRegistrationIssue("session", error);
    }

    try {
      const verificationUrl = `${request.nextUrl.origin}/verify-email?token=${verificationToken}`;
      await sendWelcomeVerificationEmail({
        userId: user.id,
        name: user.name,
        email: user.email,
        verificationUrl,
        targetLanguage: user.targetLanguage,
        learningGoal: user.learningGoal,
      });
    } catch (error) {
      // Email/notification delivery is non-critical: its failure must never
      // turn a successfully-created account into an apparent failed signup.
      logRegistrationIssue("welcome-email", error);
    }

    return NextResponse.json(
      {
        success: true,
        autoLogin,
        message: autoLogin
          ? "User registered successfully"
          : "Account created. Please log in to continue.",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: "An account with this email or username already exists. Please log in.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    logRegistrationIssue("registration", error);
    return NextResponse.json(
      {
        error: "We could not complete registration right now. Please try again shortly.",
        code: "REGISTRATION_UNAVAILABLE",
      },
      { status: 500 },
    );
  }
}
