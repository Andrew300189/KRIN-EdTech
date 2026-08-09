import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { acceptGroupInvitation } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const result = await acceptGroupInvitation(guard.user.id, (await params).token);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to accept invitation." }, { status: 400 });
  }
}
