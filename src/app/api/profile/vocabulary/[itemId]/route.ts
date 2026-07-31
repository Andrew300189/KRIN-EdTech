import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { archiveOrRestoreDictionaryWord, removeCustomWordFromDictionary } from "@/modules/vocabulary/services/vocabulary.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const item = await archiveOrRestoreDictionaryWord(guard.user.id, (await params).itemId, await request.json());
    return NextResponse.json({ data: item });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid vocabulary action", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update word" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    await removeCustomWordFromDictionary(guard.user.id, (await params).itemId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete custom word" }, { status: 404 });
  }
}
