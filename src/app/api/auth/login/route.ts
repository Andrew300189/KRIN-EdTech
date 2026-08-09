import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import {
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from "@/core/server/password";
import { createSession } from "@/core/server/session";
import { logAuthDiagnostic } from "@/core/server/auth-diagnostics";
import { createPublicAuthFailure } from "@/core/server/auth-error";
import { isPlatformOwner } from "@/core/server/platform-owner";
import { authorizeCredentials } from "@/modules/auth/services/credentials-login.service";
import { getPostLoginPath } from "@/core/utils/workspace-path";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    logAuthDiagnostic({ event: "auth_provider", provider: "credentials" });
    const body = await request.json();
    const result = await authorizeCredentials(body ?? {}, {
      findByEmail: (email) =>
        prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            passwordHash: true,
            isBlocked: true,
            deletedAt: true,
            username: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
          },
        }),
      verifyPassword,
    });

    if (!result.ok) {
      return NextResponse.json(
        createPublicAuthFailure("invalid_credentials"),
        { status: 401 },
      );
    }

    const user = result.user;
    logAuthDiagnostic({
      event: "normalized_email_match_owner",
      matchesOwner: isPlatformOwner(user.email),
    });

    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(passwordNeedsRehash(user.passwordHash)
            ? { passwordHash: hashPassword(typeof body?.password === "string" ? body.password : "") }
            : {}),
        },
      }),
      createSession(user.id, { headers: request.headers }),
    ]);

    const destination = getPostLoginPath(
      user.email,
      user.role,
      typeof body?.next === "string" ? body.next : undefined,
    );
    logAuthDiagnostic({ event: "auth_success", provider: "credentials" });
    logAuthDiagnostic({ event: "session_has_email", hasEmail: Boolean(user.email) });
    logAuthDiagnostic({ event: "post_auth_destination", destination });

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role.toLowerCase(),
          workspacePath: destination,
          emailVerified: user.emailVerified,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      createPublicAuthFailure("auth_unavailable"),
      { status: 500 },
    );
  }
}
