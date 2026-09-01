import { prisma } from "@/core/server/prisma";
import {
  buildPlacementTestResult,
  placementLegacyLevel,
  type PlacementCefrLevel,
} from "./placement-test-result";

export type PlacementCourseRecommendation = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  accessPlan: string;
  coverImage: string | null;
  level: PlacementCefrLevel;
  category: string;
};

export type PlacementDashboardResult = {
  level: PlacementCefrLevel | null;
  recommendationLevel: PlacementCefrLevel;
  scorePercent: number;
  correctAnswers: number;
  questionCount: number;
  testedAt: Date;
  recommendations: PlacementCourseRecommendation[];
};

function recommendedLevel(level: PlacementCefrLevel | null): PlacementCefrLevel {
  return level ?? "A1";
}

async function listRecommendations(level: PlacementCefrLevel): Promise<PlacementCourseRecommendation[]> {
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      isTemplate: false,
      isVisibleInStudentDashboard: true,
      isVisibleInCatalog: true,
      accessMode: { not: "HIDDEN" },
      level: { code: level, isPublished: true },
      category: { isPublished: true },
    },
    orderBy: [{ isVisibleInRecommendations: "desc" }, { isFeatured: "desc" }, { order: "asc" }, { updatedAt: "desc" }],
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      accessPlan: true,
      coverImage: true,
      level: { select: { code: true } },
      category: { select: { title: true } },
    },
  });

  return courses.map((course) => ({
    ...course,
    level: course.level.code as PlacementCefrLevel,
    category: course.category.title,
  }));
}

/** Saves a validated learner-owned placement result and its recommendation basis. */
export async function savePlacementTestResult(userId: string, answers: boolean[]) {
  const result = buildPlacementTestResult(answers);
  const level = recommendedLevel(result.level);
  const testedAt = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      placementLevel: result.level,
      placementScore: result.scorePercent,
      placementQuestionCount: result.questionCount,
      placementBreakdown: result.breakdown,
      placementTestedAt: testedAt,
      currentLevel: placementLegacyLevel(result.level),
      takePlacementTest: false,
    },
  });

  return {
    ...result,
    recommendationLevel: level,
    testedAt,
    recommendations: await listRecommendations(level),
  };
}

/** The persistent dashboard view never uses local browser answers as its source of truth. */
export async function getPlacementDashboardResult(userId: string): Promise<PlacementDashboardResult | null> {
  const placement = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      placementLevel: true,
      placementScore: true,
      placementQuestionCount: true,
      placementBreakdown: true,
      placementTestedAt: true,
    },
  });

  if (!placement?.placementTestedAt || placement.placementScore === null || placement.placementQuestionCount === null) return null;

  const level = placement.placementLevel as PlacementCefrLevel | null;
  const recommendationLevel = recommendedLevel(level);
  const breakdown = Array.isArray(placement.placementBreakdown)
    ? placement.placementBreakdown
    : [];
  const correctAnswers = breakdown.reduce<number>((total, row) => {
    if (!row || typeof row !== "object" || !("correct" in row)) return total;
    const value = (row as { correct?: unknown }).correct;
    return total + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    level,
    recommendationLevel,
    scorePercent: placement.placementScore,
    correctAnswers,
    questionCount: placement.placementQuestionCount,
    testedAt: placement.placementTestedAt,
    recommendations: await listRecommendations(recommendationLevel),
  };
}
