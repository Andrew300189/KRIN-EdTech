import { NextResponse } from "next/server";
import { destroySession, getValidatedSession } from "@/core/server/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await getValidatedSession({ allowCookieMutation: true, touch: false });
    await destroySession();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
