import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { nextAuthOptions } from "@/core/server/next-auth";

const handler = NextAuth(nextAuthOptions);

// NextAuth v4 can lose the dynamic catch-all action in Next.js 16 after an
// OAuth provider redirects with GET. Keep the provider callback explicit.
export async function GET(request: NextRequest) {
  return handler(request, {
    params: { nextauth: ["callback", "google"] },
  });
}
