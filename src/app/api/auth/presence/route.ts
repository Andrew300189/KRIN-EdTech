import { NextResponse } from "next/server";
import { touchUserPresence } from "@/core/server/presence";
import { requireAuth } from "@/core/server/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const authenticated = await requireAuth();
  if (!authenticated) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  await touchUserPresence(authenticated.user.id);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
