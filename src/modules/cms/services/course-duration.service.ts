import { prisma } from "@/core/server/prisma";

export type CourseDurationEstimate = {
  minutes: number;
  totalSeconds: number;
  lessonCount: number;
  exerciseCount: number;
};

const ENGINE_SECONDS: Record<string, number> = {
  // A choice is one deliberate click, not a one-minute activity. Compound
  // engines use the number of items below, at five seconds per interaction.
  choice: 5,
  "single-choice": 5,
  "multiple-choice": 5,
  "true-false-not-given": 5,
  "text-input": 18,
  "fill-in-the-blanks": 10,
  "dropdown-gaps": 5,
  "drag-and-drop": 5,
  matching: 5,
  sorting: 5,
  "sentence-builder": 5,
  categorization: 5,
  "find-and-correct": 20,
  "highlight-text": 5,
  "reading-with-questions": 75,
  "audio-with-questions": 75,
  "video-with-questions": 90,
  "voice-recording": 120,
  "ai-speaking-dialogue": 150,
  "pronunciation-check": 90,
  "writing-assignment": 150,
  translation: 60,
  flashcards: 5,
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

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function itemCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/**
 * Estimates active learning time from actual interactions. Legacy
 * `timeLimitSeconds` values are deliberately not used: they are author-facing
 * limits and previously inflated a single click into 30–60 seconds.
 */
function exerciseSeconds(exercise: { engineKey: string; difficulty: number; basePoints: number; timeLimitSeconds: number | null; content: unknown; correctAnswer: unknown }) {
  const content = asRecord(exercise.content);
  const engine = exercise.engineKey;
  const base = ENGINE_SECONDS[engine] ?? 18;
  const options = itemCount(content.options);
  const pairs = itemCount(content.left);
  const items = Math.max(itemCount(content.items), itemCount(content.categories));
  const gaps = Math.max(itemCount(content.gaps), itemCount(content.blankIds));
  const answerItems = itemCount(exercise.correctAnswer);

  let interactionSeconds = base;
  if (["matching", "drag-and-drop"].includes(engine)) interactionSeconds = Math.max(10, pairs * 5 || base);
  if (["sorting", "sentence-builder"].includes(engine)) interactionSeconds = Math.max(10, options * 5 || base);
  if (engine === "categorization") interactionSeconds = Math.max(10, items * 5 || base);
  if (["fill-in-the-blanks", "dropdown-gaps"].includes(engine)) interactionSeconds = Math.max(5, gaps * (engine === "dropdown-gaps" ? 5 : 10) || base);
  if (engine === "multiple-choice") interactionSeconds = Math.max(5, answerItems * 5 || base);

  const difficultyFactor = 0.95 + Math.min(5, Math.max(1, exercise.difficulty)) * 0.04;
  return Math.max(5, Math.round(interactionSeconds * difficultyFactor));
}

function blockSeconds(block: { type: string; title: string | null; content: unknown; settings: unknown; exercises: Array<{ engineKey: string; difficulty: number; basePoints: number; timeLimitSeconds: number | null; content: unknown; correctAnswer: unknown }> }) {
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
                    select: { engineKey: true, difficulty: true, basePoints: true, timeLimitSeconds: true, content: true, correctAnswer: true },
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
