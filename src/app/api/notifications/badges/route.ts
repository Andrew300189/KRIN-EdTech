import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notificationService } from "@/modules/communications/services/notification.service";
import { allowCommunicationAction, isSameOriginRequest, requireCommunicationUser } from "@/modules/communications/services/communication-security";
import { NOTIFICATION_BADGE_SECTIONS } from "@/modules/communications/types/navigation-badges";
import { prisma } from "@/core/server/prisma";

const markSchema = z.object({ section: z.enum(NOTIFICATION_BADGE_SECTIONS) });

export async function GET(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!allowCommunicationAction("badge-counts", guard.user.id, 90)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const [badges, openMistakeCount] = await Promise.all([
    notificationService.getNavigationBadgeCounts(guard.user.id),
    prisma.userMistake.count({ where: { userId: guard.user.id, resolvedAt: null } }),
  ]);
  return NextResponse.json({ badges, openMistakeCount });
}

export async function POST(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowCommunicationAction("badge-read", guard.user.id, 30)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = markSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid notification section." }, { status: 400 });
  const result = await notificationService.markNavigationSectionAsRead(guard.user.id, body.data.section);
  return NextResponse.json({ updated: result.count });
}
