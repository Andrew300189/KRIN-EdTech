import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { archiveUserFromCms, restoreUserFromCms, UserAdministrationError } from "@/modules/cms/services/user-administration.service";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const result = await archiveUserFromCms(guard.user.id, (await params).userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof UserAdministrationError ? error.status : 500;
    const message = error instanceof UserAdministrationError ? error.message : "Unable to delete user.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null);
  if (body?.action !== "restore") return NextResponse.json({ error: "Unsupported user action." }, { status: 400 });
  try {
    const result = await restoreUserFromCms(guard.user.id, (await params).userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const status = error instanceof UserAdministrationError ? error.status : 500;
    const message = error instanceof UserAdministrationError ? error.message : "Unable to restore user.";
    return NextResponse.json({ error: message }, { status });
  }
}
