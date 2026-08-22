import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import {
  getCmsNotificationSummary,
  markCmsNotificationsAsSeen,
} from "@/modules/cms/services/cms-notification-inbox.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const seenSchema = z.object({ seenThrough: z.string().datetime() });

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const response = NextResponse.json({ data: await getCmsNotificationSummary(guard.user.id) });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = seenSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid notification read marker." }, { status: 400 });

  await markCmsNotificationsAsSeen(guard.user.id, new Date(body.data.seenThrough));
  return NextResponse.json({ ok: true });
}
