import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/core/server/prisma";

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body?.token as string | undefined;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findFirst({
      // The plain token branch is temporary compatibility for links sent before
      // token hashing was introduced. Newly issued tokens are stored hashed.
      where: {
        OR: [
          { emailVerificationToken: tokenHash },
          { emailVerificationToken: token },
        ],
      },
      select: { id: true, emailVerificationSentAt: true },
    });
    if (
      !user ||
      !user.emailVerificationSentAt ||
      Date.now() - user.emailVerificationSentAt.getTime() > VERIFICATION_TOKEN_TTL_MS
    ) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
