import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { deleteGrammarRule, updateGrammarRule } from "@/modules/grammar/services/grammar-cms.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ topicId: string; ruleId: string }> }) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); const { topicId, ruleId } = await params; try { return NextResponse.json({ data: await updateGrammarRule(guard.user.id, topicId, ruleId, await request.json()) }); } catch (error) { return NextResponse.json({ error: error instanceof ZodError ? "Invalid grammar rule." : error instanceof Error ? error.message : "Unable to update grammar rule." }, { status: 400 }); } }
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ topicId: string; ruleId: string }> }) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); const { topicId, ruleId } = await params; return (await deleteGrammarRule(guard.user.id, topicId, ruleId)) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Grammar rule not found." }, { status: 404 }); }
