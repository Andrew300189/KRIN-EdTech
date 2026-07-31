import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { createRefund } from "@/modules/payments/services/payment.service";

const schema = z.object({ paymentId: z.string().cuid(), reason: z.string().trim().max(500).optional() });
export async function POST(request: NextRequest) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const value = schema.safeParse(await request.json().catch(() => null));
  if (!value.success) return NextResponse.json({ error: "Invalid refund request." }, { status: 400 });
  try { return NextResponse.json({ refund: await createRefund(guard.user.id, value.data.paymentId, value.data.reason) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create refund." }, { status: 400 }); }
}
