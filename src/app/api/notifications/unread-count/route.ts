import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/modules/communications/services/notification.service";
import { allowCommunicationAction, requireCommunicationUser } from "@/modules/communications/services/communication-security";

export async function GET(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!allowCommunicationAction("unread", guard.user.id, 120)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  return NextResponse.json({ unreadCount: await notificationService.getUnreadCount(guard.user.id) });
}
