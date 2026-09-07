import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getLearningBonusBalance } from "@/modules/motivation/services/learning-bonus.service";

/** The browser may read its own balance only; all awards and debits stay server-owned. */
export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await getLearningBonusBalance(guard.user.id) });
}
