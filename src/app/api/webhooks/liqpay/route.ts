import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/modules/payments/services/payment-provider.factory";
import { processVerifiedPaymentEvent } from "@/modules/payments/services/payment.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("application/x-www-form-urlencoded")) return NextResponse.json({ error: "Unsupported callback content type." }, { status: 415 });
  try {
    const verified = await getPaymentProvider("LIQPAY").verifyWebhook({ body: await request.text() });
    await processVerifiedPaymentEvent(verified);
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid LiqPay callback." }, { status: 400 });
  }
}
