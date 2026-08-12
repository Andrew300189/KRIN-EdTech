import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/core/server/prisma";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";

const id = z.string().trim().min(1).max(191);
const productSchema = z.object({
  code: z.string().trim().min(3).max(80).regex(/^[A-Z0-9_]+$/), slug: z.string().trim().min(3).max(120), title: z.string().trim().min(2).max(160), description: z.string().trim().max(1000).optional(), type: z.enum(["SUBSCRIPTION_PLAN", "COURSE", "COURSE_BUNDLE", "MODULE", "LESSON_PACK"]), planId: id.optional().nullable(), courseId: id.optional().nullable(), moduleId: id.optional().nullable(),
  accessStartLessonOrder: z.number().int().min(1).max(10_000).optional().nullable(),
  accessEndLessonOrder: z.number().int().min(1).max(10_000).optional().nullable(),
  isPublic: z.boolean().default(true),
}).superRefine((value, context) => {
  if ((value.accessStartLessonOrder || value.accessEndLessonOrder) && value.type !== "LESSON_PACK") context.addIssue({ code: z.ZodIssueCode.custom, message: "Only a lesson pack can limit lesson access." });
  if (value.accessStartLessonOrder && value.accessEndLessonOrder && value.accessStartLessonOrder > value.accessEndLessonOrder) context.addIssue({ code: z.ZodIssueCode.custom, message: "The lesson-pack end must not precede its start." });
  if (value.type === "LESSON_PACK" && !value.courseId) context.addIssue({ code: z.ZodIssueCode.custom, message: "A lesson pack requires a course." });
});
export async function GET(request: NextRequest) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); return NextResponse.json({ products: await prisma.product.findMany({ include: { prices: true, plan: true, course: { select: { title: true } }, module: { select: { title: true } } }, orderBy: { createdAt: "desc" } }) }); }
export async function POST(request: NextRequest) { const guard = await requirePlatformOwner(request); if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status }); const value = productSchema.safeParse(await request.json().catch(() => null)); if (!value.success) return NextResponse.json({ error: "Invalid product." }, { status: 400 }); try { const product = await prisma.product.create({ data: value.data }); await prisma.contentAuditLog.create({ data: { actorId: guard.user.id, action: "PRODUCT_CREATED", entityType: "Product", entityId: product.id } }); return NextResponse.json({ product }, { status: 201 }); } catch { return NextResponse.json({ error: "Product code or slug already exists." }, { status: 409 }); } }
