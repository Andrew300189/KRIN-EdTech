import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/server/auth";
import { prisma } from "@/core/server/prisma";
import { getSessionUserId } from "@/core/server/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    return NextResponse.json({ authenticated: true, user }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { guidedTourCompleted?: boolean };

    if (typeof body.guidedTourCompleted === "boolean") {
      await prisma.user.update({
        where: { id: userId },
        data: { guidedTourCompleted: body.guidedTourCompleted },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
