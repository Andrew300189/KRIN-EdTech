import { NextResponse } from "next/server";
import { destroySession } from "@/core/server/session";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
