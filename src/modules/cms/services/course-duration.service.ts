import { prisma } from "@/core/server/prisma";

export type CourseDurationEstimate = {
  minutes: number;
  totalSeconds: number;
  lessonCount: number;
  exerciseCount: number;
};

const ENGINE_SECONDS: Record<string, number> = {
  choice: 20,
  "single-choice": 20,
  "multiple-choice": 30,
  "true-false-not-given": 25,
  "text-input": 35,
  "fill-in-the-blanks": 35,
  "dropdown-gaps": 30,
  "drag-and-drop": 45,
  matching: 45,
  sorting: 45,
  "sentence-builder": 45,
  categorization: 50,
  "find-and-correct": 50,
  "highlight-text": 40,
  "reading-with-questions": 75,
  "audio-with-questions": 75,
  "video-with-questions": 90,
  "voice-recording": 120,
  "ai-speaking-dialogue": 150,
  "pronunciation-check": 90,
  "writing-assignment": 150,
  translation: 60,
  flashcards: 20,
  "interactive-dialogue": 75,
  "timed-quiz": 45,
  "adaptive-test": 60,
  "teacher-reviewed-assignment": 180,
  "peer-review": 180,
  "project-assignment": 240,
  "game-scenario": 75,
  "personal-error-review": 45,
};

function textLength(value: unknown): number {
  if (typeof value === "string") {
    if (value.startsWith("data:image/") || /^https?:\/\//i.test(value)) return 0;
    return value.length;
  }
  if (Array.isArray(value)) return value.reduce((total, item) => total + textLength(item), 0);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).reduce<number>((total, item) => total + textLength(item), 0);
  return 0;
}

function exerciseSeconds(exercise: { engineKey: string; difficulty: number; basePoints: number; timeLimitSeconds: number | null }) {
  const base = ENGINE_SECONDS[exercise.engineKey] ?? 35;
  const difficultyFactor = 0.82 + Math.min(5, Math.max(1, exercise.difficulty)) * 0.12;
  const pointsFactor = 1 + Math.min(0.2, Math.max(0, exercise.basePoints - 1) * 0.025);
  const weighted = Math.round(base * difficultyFactor * pointsFactor);
  return exercise.timeLimitSeconds ? Math.max(weighted, Math.min(exercise.timeLimitSeconds, 300)) : weighted;
}

function blockSeconds(block: { type: string; title: string | null; content: unknown; settings: unknown; exercises: Array<{ engineKey: string; difficulty: number; basePoints: number; timeLimitSeconds: number | null }> }) {
  if (block.exercises.length) return block.exercises.reduce((total, exercise) => total + exerciseSeconds(exercise), 0);
  const words = Math.ceil((textLength(block.title) + textLength(block.content) + textLength(block.settings)) / 5);
  const reading = Math.min(420, Math.max(20, Math.ceil(words / 2.4)));
  if (["VIDEO", "LISTENING", "DIALOGUE"].includes(block.type)) return Math.max(60, reading);
  if (["HOMEWORK", "DISCUSSION"].includes(block.type)) return Math.max(120, reading);
  if (block.type === "IMAGE") return Math.max(15, reading);
  if (block.type === "BREAK") return 60;
  return reading;
}

export async function getCourseDurationEstimate(courseId: string): Promise<CourseDurationEstimate> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      modules: {
        where: { contentStatus: { not: "ARCHIVED" } },
        select: {
          lessons: {
            where: { contentStatus: { not: "ARCHIVED" } },
            select: {
              estimatedDuration: true,
              blocks: {
                where: { contentStatus: { not: "ARCHIVED" } },
                select: {
                  type: true,
                  title: true,
                  content: true,
                  settings: true,
                  exercises: {
                    where: { contentStatus: { not: "ARCHIVED" } },
                    select: { engineKey: true, difficulty: true, basePoints: true, timeLimitSeconds: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course) throw new Error("Course not found");

  const lessons = course.modules.flatMap((module) => module.lessons);
  const exerciseCount = lessons.reduce((total, lesson) => total + lesson.blocks.reduce((blocksTotal, block) => blocksTotal + block.exercises.length, 0), 0);
  const totalSeconds = lessons.reduce((total, lesson) => {
    const authoredSeconds = lesson.blocks.reduce((blockTotal, block) => blockTotal + blockSeconds(block), 0);
    return total + (authoredSeconds || Math.max(0, lesson.estimatedDuration) * 60);
  }, 0);

  return {
    totalSeconds,
    minutes: totalSeconds > 0 ? Math.max(1, Math.ceil(totalSeconds / 60)) : 0,
    lessonCount: lessons.length,
    exerciseCount,
  };
}

/** Keeps the stored public course duration in sync with authored lesson content. */
export async function syncCourseEstimatedDuration(courseId: string) {
  const estimate = await getCourseDurationEstimate(courseId);
  await prisma.course.update({ where: { id: courseId }, data: { estimatedDuration: estimate.minutes, lessonCount: estimate.lessonCount } });
  return estimate;
}

export async function syncCourseDurationForLessonBlock(lessonBlockId: string) {
  const block = await prisma.lessonBlock.findUnique({
    where: { id: lessonBlockId },
    select: { lesson: { select: { module: { select: { courseId: true } } } } },
  });
  if (!block) return null;
  return syncCourseEstimatedDuration(block.lesson.module.courseId);
}
