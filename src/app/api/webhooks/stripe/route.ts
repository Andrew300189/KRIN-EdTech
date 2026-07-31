import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/modules/payments/services/payment-provider.factory";
import { processVerifiedPaymentEvent } from "@/modules/payments/services/payment.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const verified = await getPaymentProvider("STRIPE").verifyWebhook({ body: await request.text(), signature: request.headers.get("stripe-signature") });
    await processVerifiedPaymentEvent(verified);
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Stripe webhook." }, { status: 400 });
  }
}
