import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { exchangeExperienceForXpCoins, exchangeXpCoinsForKrinCoins } from "@/modules/motivation/services/motivation.service";

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const limit = consumeRateLimit(`xp-coin-exchange:${guard.user.id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many exchange attempts. Try again in a minute." }, { status: 429 });

  const body = await request.json().catch(() => null) as { mode?: unknown; experience?: unknown; xpCoins?: unknown; idempotencyKey?: unknown } | null;
  const mode = body?.mode === "XP_COIN_TO_KRIN" ? "XP_COIN_TO_KRIN" : "XP_TO_XP_COIN";
  const amount = mode === "XP_TO_XP_COIN" ? body?.experience : body?.xpCoins;
  if (!body || typeof amount !== "number") {
    return NextResponse.json({ error: mode === "XP_TO_XP_COIN" ? "Enter the amount of XP to exchange." : "Enter the amount of XP Coins to exchange." }, { status: 400 });
  }
  const idempotencyKey = typeof body.idempotencyKey === "string" && /^[a-z0-9-]{16,80}$/i.test(body.idempotencyKey)
    ? body.idempotencyKey
    : undefined;

  try {
    const data = mode === "XP_TO_XP_COIN"
      ? await exchangeExperienceForXpCoins(guard.user.id, amount, idempotencyKey)
      : await exchangeXpCoinsForKrinCoins(guard.user.id, amount, idempotencyKey);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to exchange XP." }, { status: 400 });
  }
}
