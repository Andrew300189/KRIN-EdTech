import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { exchangeExperienceForKrinCoins } from "@/modules/motivation/services/motivation.service";

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const limit = consumeRateLimit(`xp-krin-exchange:${guard.user.id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many exchange attempts. Try again in a minute." }, { status: 429 });

  const body = await request.json().catch(() => null) as { mode?: unknown; experience?: unknown; idempotencyKey?: unknown } | null;
  if (body?.mode !== "XP_TO_KRIN" || typeof body.experience !== "number") {
    return NextResponse.json({ error: "Enter the amount of XP to exchange for KRIN Coins." }, { status: 400 });
  }
  const idempotencyKey = typeof body.idempotencyKey === "string" && /^[a-z0-9-]{16,80}$/i.test(body.idempotencyKey)
    ? body.idempotencyKey
    : undefined;

  try {
    const data = await exchangeExperienceForKrinCoins(guard.user.id, body.experience, idempotencyKey);
    return NextResponse.json({ data: {
      exchangedExperience: data.exchangedExperience,
      krinCoinsAdded: data.krinCoinsAdded,
      level: data.level,
      wallet: { balance: data.wallet.balance, fractionalBalance: data.wallet.fractionalBalance },
    } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to exchange XP." }, { status: 400 });
  }
}
