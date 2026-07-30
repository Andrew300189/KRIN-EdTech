import { NextResponse } from "next/server";
import { requireAuth } from "@/core/server/session";
import { prisma } from "@/core/server/prisma";

export const runtime = "nodejs";

export async function POST() {
  try {
    const authenticated = await requireAuth();
    if (!authenticated || authenticated.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    const revoked = await prisma.session.deleteMany({
      where: {
        OR: [
          { isRevoked: true },
          { expiresAt: { lte: now } },
        ],
      },
    });

    return NextResponse.json(
      { success: true, deleted: revoked.count },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
