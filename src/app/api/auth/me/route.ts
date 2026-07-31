import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/server/auth";
import { prisma } from "@/core/server/prisma";
import { requireAuth } from "@/core/server/session";
import { refreshSubscriptionAccessCookie } from "@/modules/payments/services/subscription-cookie";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 },
      );
    }

    await refreshSubscriptionAccessCookie(user);

    return NextResponse.json({ authenticated: true, user }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authenticated = await requireAuth();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { guidedTourCompleted?: boolean };

    if (typeof body.guidedTourCompleted === "boolean") {
      await prisma.user.update({
        where: { id: authenticated.user.id },
        data: { guidedTourCompleted: body.guidedTourCompleted },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
