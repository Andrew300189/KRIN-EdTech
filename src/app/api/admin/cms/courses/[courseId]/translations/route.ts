import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { z, ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { jsonValueSchema } from "@/modules/courses/schemas/content.schemas";
import {
  createCourseTranslationDraft,
  getCourseTranslationWorkspace,
  listCourseTranslationSummaries,
  setCourseTranslationPublication,
  updateCourseTranslation,
  type CourseTranslationUpdate,
} from "@/modules/cms/services/course-localization.service";

const localeSchema = z.string().trim().regex(/^[a-z]{2}(?:-[a-z]{2})?$/i).max(12);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const requiredText = (min: number, max: number) => z.string().trim().min(min).max(max).optional();

const translationActionSchema = z.object({ action: z.enum(["CREATE_DRAFT", "PUBLISH", "UNPUBLISH"]), locale: localeSchema });
const translationUpdateSchema = z.discriminatedUnion("entityType", [
  z.object({ entityType: z.literal("COURSE"), entityId: z.string().cuid(), values: z.object({ slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160).optional(), title: requiredText(2, 160), shortDescription: requiredText(10, 500), fullDescription: optionalText(10_000), seoTitle: optionalText(160), seoDescription: optionalText(500), seoKeywords: optionalText(500), learningOutcomes: jsonValueSchema.optional(), prerequisites: jsonValueSchema.optional() }).refine((values) => Object.keys(values).length > 0, "Choose a value to translate.") }),
  z.object({ entityType: z.literal("MODULE"), entityId: z.string().cuid(), values: z.object({ title: requiredText(2, 160), description: optionalText(2_000) }).refine((values) => Object.keys(values).length > 0, "Choose a value to translate.") }),
  z.object({ entityType: z.literal("LESSON"), entityId: z.string().cuid(), values: z.object({ slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160).optional(), title: requiredText(2, 160), description: optionalText(5_000), phraseOfTheDay: optionalText(500), motivationalQuote: optionalText(1_000), learningObjectives: jsonValueSchema.optional(), previewText: optionalText(2_000) }).refine((values) => Object.keys(values).length > 0, "Choose a value to translate.") }),
  z.object({ entityType: z.literal("LESSON_BLOCK"), entityId: z.string().cuid(), values: z.object({ title: optionalText(160), content: jsonValueSchema.optional() }).refine((values) => Object.keys(values).length > 0, "Choose a value to translate.") }),
  z.object({ entityType: z.literal("EXERCISE"), entityId: z.string().cuid(), values: z.object({ instruction: requiredText(1, 2_000), question: requiredText(1, 5_000), content: jsonValueSchema.optional(), explanation: optionalText(5_000), hint: optionalText(2_000) }).refine((values) => Object.keys(values).length > 0, "Choose a value to translate.") }),
]);

function jsonInput(value: unknown) {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

function toUpdate(input: z.infer<typeof translationUpdateSchema>): CourseTranslationUpdate {
  if (input.entityType === "COURSE") {
    const { learningOutcomes, prerequisites, ...values } = input.values;
    return { entityType: input.entityType, entityId: input.entityId, values: { ...values, ...(learningOutcomes !== undefined ? { learningOutcomes: jsonInput(learningOutcomes) } : {}), ...(prerequisites !== undefined ? { prerequisites: jsonInput(prerequisites) } : {}) } };
  }
  if (input.entityType === "MODULE") return input;
  if (input.entityType === "LESSON") {
    const { learningObjectives, ...values } = input.values;
    return { entityType: input.entityType, entityId: input.entityId, values: { ...values, ...(learningObjectives !== undefined ? { learningObjectives: jsonInput(learningObjectives) } : {}) } };
  }
  const { content, ...values } = input.values;
  return { entityType: input.entityType, entityId: input.entityId, values: { ...values, ...(content !== undefined ? { content: jsonInput(content) } : {}) } };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { courseId } = await params;
    const locale = request.nextUrl.searchParams.get("locale");
    if (locale) {
      const workspace = await getCourseTranslationWorkspace(courseId, locale);
      return workspace ? NextResponse.json({ data: workspace }) : NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const summaries = await listCourseTranslationSummaries(courseId);
    return summaries ? NextResponse.json({ data: summaries }) : NextResponse.json({ error: "Course not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load translations." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { courseId } = await params;
    const input = translationActionSchema.parse(await request.json());
    if (input.action === "CREATE_DRAFT") {
      const summaries = await createCourseTranslationDraft(guard.user.id, courseId, input.locale);
      return NextResponse.json({ data: summaries });
    }
    await setCourseTranslationPublication(guard.user.id, courseId, input.locale, input.action === "PUBLISH");
    return NextResponse.json({ data: await listCourseTranslationSummaries(courseId) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid translation request.", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update translation." }, { status: 400 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { courseId } = await params;
    const locale = localeSchema.parse(request.nextUrl.searchParams.get("locale"));
    const input = translationUpdateSchema.parse(await request.json());
    await updateCourseTranslation(guard.user.id, courseId, locale, toUpdate(input));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid translated content.", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save translated content." }, { status: 400 });
  }
}
