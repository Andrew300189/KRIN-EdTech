import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/modules/communications/services/notification.service";
import { processLearningReminders } from "@/modules/communications/services/reminder.service";
import { publishDueAnnouncements } from "@/modules/communications/services/announcement.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_WORKER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [deliveries, reminders, retention, announcements] = await Promise.all([notificationService.processDeliveryQueue(), processLearningReminders(), notificationService.applyCommunicationRetentionPolicy(), publishDueAnnouncements()]);
  return NextResponse.json({ deliveries, reminders, announcements, retentionArchived: retention.count });
}
