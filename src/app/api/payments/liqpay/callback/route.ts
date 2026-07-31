// Legacy LiqPay callback retained while merchants update server_url to /api/webhooks/liqpay.
import { POST as handleLiqPayWebhook } from "@/app/api/webhooks/liqpay/route";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleLiqPayWebhook(request);
}
