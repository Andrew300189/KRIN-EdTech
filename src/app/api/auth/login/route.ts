import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import {
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from "@/core/server/password";
import { createSession } from "@/core/server/session";
import { authenticateCredentials } from "@/modules/auth/services/credentials-login.service";
import { getRoleWorkspacePath } from "@/core/utils/workspace-path";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await authenticateCredentials(body ?? {}, {
      findByIdentifier: (identifier) =>
        prisma.user.findFirst({
          where: { OR: [{ email: identifier }, { username: identifier }] },
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
        {
          error:
            result.reason === "INVALID_INPUT"
              ? "Email and password are required"
              : "Invalid credentials",
        },
        { status: result.reason === "INVALID_INPUT" ? 400 : 401 },
      );
    }

    const user = result.user;

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
          workspacePath: getRoleWorkspacePath(user.role),
          emailVerified: user.emailVerified,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
