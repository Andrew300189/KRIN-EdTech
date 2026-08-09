import { NextRequest, NextResponse } from "next/server";
import { listAdminTickets } from "@/modules/communications/services/support.service";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"] as const;
export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const status = request.nextUrl.searchParams.get("status");
  if (status && !STATUSES.includes(status as typeof STATUSES[number])) return NextResponse.json({ error: "Invalid ticket status." }, { status: 400 });
  return NextResponse.json(await listAdminTickets({ status: status as typeof STATUSES[number] | undefined, cursor: request.nextUrl.searchParams.get("cursor") || undefined }));
}
