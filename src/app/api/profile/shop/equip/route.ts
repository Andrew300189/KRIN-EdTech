import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { equipShopItem } from "@/modules/motivation/services/reward-economy.service";

const equipSchema = z.object({ itemId: z.string().trim().min(1).max(80) });

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`shop-equip:${guard.user.id}`, 15, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const parsed = equipSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid shop item." }, { status: 400 });
  try {
    return NextResponse.json({ data: await equipShopItem(guard.user.id, parsed.data.itemId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to equip this item." }, { status: 400 });
  }
}
