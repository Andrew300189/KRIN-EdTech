import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/server/session";
import { isSameOriginRequest } from "@/modules/payments/services/billing-security";
import { createCustomerPortal } from "@/modules/payments/services/stripe.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authenticated = await requireAuth({ headers: request.headers });
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!authenticated.user.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe billing account exists yet." }, { status: 400 });
  }

  try {
    const origin = new URL(process.env.NEXTAUTH_URL || request.url).origin;
    const url = await createCustomerPortal(authenticated.user.stripeCustomerId, origin);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Unable to open the billing portal." }, { status: 503 });
  }
}
