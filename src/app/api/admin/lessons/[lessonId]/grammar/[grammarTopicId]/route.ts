import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { unlinkGrammarTopicFromLesson } from "@/modules/grammar/services/grammar-cms.service";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ lessonId: string; grammarTopicId: string }> }) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); const { lessonId, grammarTopicId } = await params; return (await unlinkGrammarTopicFromLesson(guard.user.id, lessonId, grammarTopicId)) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Grammar link not found." }, { status: 404 }); }
