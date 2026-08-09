import type {
  CreateTeacherCourseInput,
  TeacherCourse,
} from "@/core/types/course";
import { prisma } from "@/core/server/prisma";
import { createCourse } from "@/modules/courses/services/content.service";

function toCefrLevel(level: CreateTeacherCourseInput["level"]) {
  if (level === "beginner") return "A1" as const;
  if (level === "intermediate") return "B1" as const;
  return "C1" as const;
}

function mapTeacherCourse(course: {
  id: string;
  title: string;
  shortDescription: string;
  legacyLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  academySlug: string;
  pathSlug: string;
  stageSlug: string;
  isPublished: boolean;
  instructorId: string;
  createdAt: Date;
}): TeacherCourse {
  const level = course.legacyLevel === "BEGINNER"
    ? "beginner"
    : course.legacyLevel === "INTERMEDIATE"
      ? "intermediate"
      : "advanced";
  return {
    id: course.id,
    title: course.title,
    description: course.shortDescription,
    level,
    academy: course.academySlug as TeacherCourse["academy"],
    path: course.pathSlug,
    stage: course.stageSlug as TeacherCourse["stage"],
    visibility: "public",
    status: course.isPublished ? "published" : "draft",
    ownerId: course.instructorId,
    createdAt: course.createdAt.toISOString(),
  };
}

export async function listCoursesForOwner(ownerId: string): Promise<TeacherCourse[]> {
  const courses = await prisma.course.findMany({
    where: { instructorId: ownerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      legacyLevel: true,
      academySlug: true,
      pathSlug: true,
      stageSlug: true,
      isPublished: true,
      instructorId: true,
      createdAt: true,
    },
  });
  return courses.map(mapTeacherCourse);
}

export async function createCourseForOwner(
  ownerId: string,
  input: CreateTeacherCourseInput,
): Promise<TeacherCourse> {
  const created = await createCourse(ownerId, {
    levelCode: toCefrLevel(input.level),
    categorySlug: "general-english",
    title: input.title,
    shortDescription: input.description,
    language: "en",
    estimatedDuration: 0,
    isPublished: input.status === "published",
    isFeatured: false,
    courseType: "STANDARD",
    accessMode: "FREE",
    isVisibleInCatalog: true,
    isVisibleInSearch: true,
    isVisibleOnHomepage: false,
    isVisibleInRecommendations: false,
    isVisibleInLevelBlock: true,
    isVisibleInAcademy: true,
    isVisibleInStudentDashboard: true,
    firstFreeLessonCount: 0,
    accessPlan: "FREE",
    priceCurrency: "USD",
    learningOutcomes: [],
    prerequisites: [],
  });
  return mapTeacherCourse(created);
}
