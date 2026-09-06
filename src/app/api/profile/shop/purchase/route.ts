import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { purchaseShopItem } from "@/modules/motivation/services/reward-economy.service";

const purchaseSchema = z.object({ itemId: z.string().trim().min(1).max(80) });

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`shop-purchase:${guard.user.id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many purchase attempts. Please wait a moment." }, { status: 429 });
  const parsed = purchaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid shop item." }, { status: 400 });
  try {
    return NextResponse.json({ data: await purchaseShopItem(guard.user.id, parsed.data.itemId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete this purchase." }, { status: 400 });
  }
}
