import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { exerciseLearningLinksSchema } from "@/modules/grammar/schemas/grammar-cms.schemas";
import { getExerciseLearningLinks, replaceExerciseLearningLinks } from "@/modules/grammar/services/grammar-cms.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); return NextResponse.json({ data: await getExerciseLearningLinks((await params).exerciseId) }); }
export async function PUT(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); try { const input = exerciseLearningLinksSchema.parse(await request.json()); await replaceExerciseLearningLinks(guard.user.id, (await params).exerciseId, input); return NextResponse.json({ success: true }); } catch (error) { return NextResponse.json({ error: error instanceof ZodError ? "Invalid learning links." : error instanceof Error ? error.message : "Unable to update learning links." }, { status: 400 }); } }
