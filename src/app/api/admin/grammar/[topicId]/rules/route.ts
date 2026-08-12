import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createGrammarRule, listGrammarRules } from "@/modules/grammar/services/grammar-cms.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ topicId: string }> }) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); return NextResponse.json({ data: await listGrammarRules((await params).topicId) }); }
export async function POST(request: NextRequest, { params }: { params: Promise<{ topicId: string }> }) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); try { return NextResponse.json({ data: await createGrammarRule(guard.user.id, (await params).topicId, await request.json()) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof ZodError ? "Invalid grammar rule." : error instanceof Error ? error.message : "Unable to create grammar rule." }, { status: 400 }); } }
