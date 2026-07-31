import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/modules/communications/services/notification.service";
import { allowCommunicationAction, requireCommunicationUser } from "@/modules/communications/services/communication-security";

const CATEGORIES = ["ACCOUNT", "SECURITY", "LEARNING", "VOCABULARY", "MOTIVATION", "BILLING", "SUPPORT", "MARKETING", "SYSTEM"] as const;

export async function GET(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!allowCommunicationAction("list", guard.user.id, 90)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const category = request.nextUrl.searchParams.get("category");
  const limit = Number(request.nextUrl.searchParams.get("limit") || 20);
  if (category && !CATEGORIES.includes(category as typeof CATEGORIES[number])) return NextResponse.json({ error: "Invalid notification category." }, { status: 400 });
  return NextResponse.json(await notificationService.getUserNotifications(guard.user.id, { cursor: request.nextUrl.searchParams.get("cursor") || undefined, category: category as typeof CATEGORIES[number] | undefined, limit }));
}
