import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const callback =
    request.nextUrl.searchParams.get("callbackUrl") ?? "/auth/complete";
  const url = new URL(
    `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callback)}`,
    request.nextUrl.origin,
  );
  return NextResponse.redirect(url);
}
