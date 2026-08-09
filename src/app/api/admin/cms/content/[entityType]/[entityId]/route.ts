import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsContentEntityTypeSchema, cmsContentLifecycleSchema } from "@/modules/cms/schemas/content-management.schemas";
import { listCmsContentHistory, transitionCmsContent, validateCmsContentIntegrity } from "@/modules/cms/services/content-workflow.service";

type RouteContext = { params: Promise<{ entityType: string; entityId: string }> };

function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid CMS request." }, { status: 400 });
  const message = error instanceof Error ? error.message : "Unable to update content.";
  return NextResponse.json({ error: message }, { status: message === "Content item not found." ? 404 : 400 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { entityType, entityId } = await context.params;
    const type = cmsContentEntityTypeSchema.parse(entityType);
    const [history, integrity] = await Promise.all([listCmsContentHistory(type, entityId), validateCmsContentIntegrity(type, entityId)]);
    return NextResponse.json({ data: { history, integrity } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { entityType, entityId } = await context.params;
    const type = cmsContentEntityTypeSchema.parse(entityType);
    const input = cmsContentLifecycleSchema.parse(await request.json());
    const content = await transitionCmsContent({
      actorId: guard.user.id,
      entityType: type,
      entityId,
      action: input.action,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      note: input.note,
    });
    return NextResponse.json({ data: content });
  } catch (error) {
    return errorResponse(error);
  }
}
