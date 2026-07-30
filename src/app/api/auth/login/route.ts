import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { verifyPassword } from "@/core/server/password";
import { createSession } from "@/core/server/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body ?? {};

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username/email and password are required" },
        { status: 400 },
      );
    }

    const normalizedIdentifier = String(identifier).trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
      },
    });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createSession(user.id, { headers: request.headers });

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
