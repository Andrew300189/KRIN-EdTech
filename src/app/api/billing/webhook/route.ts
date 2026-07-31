// Legacy Stripe endpoint retained for an already configured Stripe CLI/webhook URL.
import { POST as handleStripeWebhook } from "@/app/api/webhooks/stripe/route";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleStripeWebhook(request);
}
