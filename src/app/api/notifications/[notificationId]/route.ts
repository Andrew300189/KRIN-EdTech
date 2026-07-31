import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notificationService } from "@/modules/communications/services/notification.service";
import { allowCommunicationAction, isSameOriginRequest, requireCommunicationUser } from "@/modules/communications/services/communication-security";

const schema = z.object({ action: z.enum(["read", "archive"]) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowCommunicationAction("update", guard.user.id, 40)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid notification action." }, { status: 400 });
  const notificationId = (await params).notificationId;
  const result = body.data.action === "read" ? await notificationService.markAsRead(guard.user.id, notificationId) : (await notificationService.archiveNotification(guard.user.id, notificationId)).count === 1;
  return result ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Notification not found." }, { status: 404 });
}
