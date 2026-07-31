import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { saveAchievement } from "@/modules/motivation/services/motivation.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ achievementId: string }> }) { const guard = await requireContentManager(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); try { return NextResponse.json({ data: await saveAchievement(guard.user.id, await request.json(), (await params).achievementId) }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid achievement", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update achievement" }, { status: 400 }); } }
