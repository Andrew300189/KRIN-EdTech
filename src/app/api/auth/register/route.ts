import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { hashPassword } from "@/core/server/password";
import { createSession } from "@/core/server/session";
import { sendWelcomeVerificationEmail } from "@/core/server/email";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "")
      .trim()
      .toLowerCase();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body?.password ?? "");

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password should be at least 6 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User with this email or username already exists" },
        { status: 409 },
      );
    }

    const verificationToken = randomBytes(24).toString("hex");

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashPassword(password),
        name: username,
        role: "STUDENT",
        emailVerificationToken: verificationToken,
        emailVerificationSentAt: new Date(),
      },
    });

    const verificationUrl = `${new URL(request.url).origin}/verify-email?token=${verificationToken}`;

    await sendWelcomeVerificationEmail({
      name: user.name,
      email: user.email,
      verificationUrl,
      targetLanguage: user.targetLanguage,
      learningGoal: user.learningGoal,
    });

    await createSession(user.id, { headers: request.headers });

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
