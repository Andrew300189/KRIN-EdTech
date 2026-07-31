import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { addVocabularyWordDetail } from "@/modules/vocabulary/services/vocabulary.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ wordId: string }> }) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const body = await request.json() as { kind?: "meaning" | "example" | "collocation" | "relation" };
    if (!body.kind || !["meaning", "example", "collocation", "relation"].includes(body.kind)) return NextResponse.json({ error: "Unsupported vocabulary detail" }, { status: 400 });
    const result = await addVocabularyWordDetail(guard.user.id, (await params).wordId, body.kind, body);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid vocabulary detail", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add detail" }, { status: 400 });
  }
}
