import { NextRequest, NextResponse } from "next/server";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { getPlatformAnalytics, listSuspiciousActivities } from "@/modules/motivation/services/motivation.service";

export async function GET(request: NextRequest) { const guard = await requireContentManager(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); const [analytics, suspiciousActivities] = await Promise.all([getPlatformAnalytics(), listSuspiciousActivities()]); return NextResponse.json({ data: { analytics, suspiciousActivities } }); }
