import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { listAdminAchievements, saveAchievement } from "@/modules/motivation/services/motivation.service";

export async function GET(request: NextRequest) { const guard = await requireContentManager(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); return NextResponse.json({ data: await listAdminAchievements() }); }
export async function POST(request: NextRequest) { const guard = await requireContentManager(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); try { return NextResponse.json({ data: await saveAchievement(guard.user.id, await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid achievement", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create achievement" }, { status: 400 }); } }
