import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { createVocabularyTrainingSession } from "@/modules/vocabulary/services/vocabulary.service";

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const session = await createVocabularyTrainingSession(guard.user.id, await request.json().catch(() => ({})));
    return NextResponse.json({ data: session }, { status: session ? 201 : 200 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid training request", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create training session" }, { status: 400 });
  }
}
