import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { lessonGrammarLinkSchema } from "@/modules/grammar/schemas/grammar-cms.schemas";
import { linkGrammarTopicToLesson, listLessonGrammarTopics } from "@/modules/grammar/services/grammar-cms.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); return NextResponse.json({ data: await listLessonGrammarTopics((await params).lessonId) }); }
export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); try { const input = lessonGrammarLinkSchema.parse(await request.json()); return NextResponse.json({ data: await linkGrammarTopicToLesson(guard.user.id, (await params).lessonId, input.grammarTopicId) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof ZodError ? "Invalid grammar link." : error instanceof Error ? error.message : "Unable to link grammar topic." }, { status: 400 }); } }
