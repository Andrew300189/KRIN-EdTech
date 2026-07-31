import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/core/server/prisma";
import { allowCommunicationAction, isSameOriginRequest, requireCommunicationUser } from "@/modules/communications/services/communication-security";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional();
const schema = z.object({ locale: z.enum(["en", "uk", "ru"]).optional(), timezone: z.string().min(1).max(80).optional(), inAppEnabled: z.boolean().optional(), emailEnabled: z.boolean().optional(), webPushEnabled: z.boolean().optional(), learningEnabled: z.boolean().optional(), vocabularyEnabled: z.boolean().optional(), motivationEnabled: z.boolean().optional(), billingEnabled: z.boolean().optional(), supportEnabled: z.boolean().optional(), marketingEnabled: z.boolean().optional(), systemEnabled: z.boolean().optional(), quietHoursEnabled: z.boolean().optional(), quietHoursStart: time, quietHoursEnd: time, dailyDigestEnabled: z.boolean().optional(), weeklyDigestEnabled: z.boolean().optional(), dailyReminderTime: time });

async function settings(userId: string, locale: string, timezone: string) {
  return prisma.userNotificationSettings.upsert({ where: { userId }, update: {}, create: { userId, locale, timezone } });
}

export async function GET(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ settings: await settings(guard.user.id, guard.user.interfaceLanguage || "en", guard.user.timeZone || "UTC") });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireCommunicationUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowCommunicationAction("settings", guard.user.id, 15)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const value = schema.safeParse(await request.json().catch(() => null));
  if (!value.success) return NextResponse.json({ error: "Invalid notification settings." }, { status: 400 });
  if (value.data.timezone) { try { Intl.DateTimeFormat(undefined, { timeZone: value.data.timezone }); } catch { return NextResponse.json({ error: "Invalid timezone." }, { status: 400 }); } }
  const result = await prisma.userNotificationSettings.upsert({ where: { userId: guard.user.id }, update: value.data, create: { userId: guard.user.id, locale: value.data.locale ?? guard.user.interfaceLanguage ?? "en", timezone: value.data.timezone ?? guard.user.timeZone ?? "UTC", ...value.data } });
  return NextResponse.json({ settings: result });
}
