import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { unlockStreakQuestBook } from "@/modules/motivation/services/streak-quest-book.service";

/** Unlock costs and reward values are looked up server-side; the browser sends
 * only the opaque book ID. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ bookId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { bookId } = await params;
  if (!/^c[a-z0-9]{20,}$/i.test(bookId)) return NextResponse.json({ error: "Invalid quest book." }, { status: 400 });

  const limit = consumeRateLimit(`streak-quest-book-unlock:${guard.user.id}:${bookId}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many unlock attempts. Please wait a moment." }, { status: 429 });
  try {
    return NextResponse.json({ data: await unlockStreakQuestBook(guard.user.id, bookId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to unlock this quest book." }, { status: 400 });
  }
}
