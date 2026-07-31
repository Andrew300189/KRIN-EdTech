import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/modules/communications/services/notification.service";
import { allowCommunicationAction, isSameOriginRequest, requireCommunicationUser } from "@/modules/communications/services/communication-security";

export async function POST(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowCommunicationAction("read-all", guard.user.id, 10)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const result = await notificationService.markAllAsRead(guard.user.id);
  return NextResponse.json({ updated: result.count });
}
