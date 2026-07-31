import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/core/server/session";
import { consumeCheckoutAttempt, isSameOriginRequest } from "@/modules/payments/services/billing-security";
import { createCheckout } from "@/modules/payments/services/payment.service";
import { isPaymentProvider } from "@/modules/payments/types/payment-provider.types";

export const runtime = "nodejs";

const checkoutSchema = z.object({ productPriceId: z.string().trim().min(1).max(191), provider: z.string(), promotionCode: z.string().trim().max(64).optional() });

export async function POST(request: NextRequest) {
  const authenticated = await requireAuth({ headers: request.headers });
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!consumeCheckoutAttempt(authenticated.user.id)) return NextResponse.json({ error: "Too many checkout attempts. Try again shortly." }, { status: 429 });
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  const provider = parsed.data.provider.toUpperCase();
  if (!isPaymentProvider(provider)) return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  try {
    const origin = new URL(process.env.NEXTAUTH_URL || request.url).origin;
    const checkout = await createCheckout({ user: authenticated.user, provider, productPriceId: parsed.data.productPriceId, promotionCode: parsed.data.promotionCode, idempotencyKey: request.headers.get("idempotency-key") ?? undefined, origin });
    return NextResponse.json({ orderId: checkout.orderId, orderNumber: checkout.orderNumber, paymentId: checkout.paymentId, ...checkout.checkout });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start secure checkout.";
    return NextResponse.json({ error: message }, { status: /already|unavailable|invalid|promotion/i.test(message) ? 400 : 503 });
  }
}
