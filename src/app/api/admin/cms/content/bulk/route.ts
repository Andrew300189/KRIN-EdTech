import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsBulkLifecycleSchema } from "@/modules/cms/schemas/content-management.schemas";
import { transitionCmsContent } from "@/modules/cms/services/content-workflow.service";

export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsBulkLifecycleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid bulk CMS request." }, { status: 400 });

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined;
  const results = await Promise.allSettled(parsed.data.entityIds.map((entityId) => transitionCmsContent({
    actorId: guard.user.id,
    entityType: parsed.data.entityType,
    entityId,
    action: parsed.data.action,
    scheduledAt,
    note: parsed.data.note,
  })));

  const succeeded = results.filter((result) => result.status === "fulfilled").length;
  const failures = results.flatMap((result, index) => result.status === "rejected" ? [{ entityId: parsed.data.entityIds[index], error: result.reason instanceof Error ? result.reason.message : "Unable to update content." }] : []);
  return NextResponse.json({ data: { succeeded, failed: failures.length, failures } }, { status: failures.length ? 207 : 200 });
}
