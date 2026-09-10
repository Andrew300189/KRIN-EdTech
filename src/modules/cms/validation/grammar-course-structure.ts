export type GrammarStructureIssue = {
  code: string;
  message: string;
  path?: string;
};

// CMS queries expose relation rows as grammarSkillId, while the pure unit
// validator also accepts compact { id } fixtures. Keeping both optional on a
// single shape makes that compatibility explicit to every TypeScript build.
type SkillLink = { grammarSkillId?: string; id?: string };

type ExerciseShape = {
  id: string;
  correctAnswer: unknown;
  explanation?: string | null;
  grammarSkills?: SkillLink[];
};

type BlockShape = {
  id: string;
  type: string;
  title?: string | null;
  content?: unknown;
  learningFragmentKey?: string | null;
  isLearningFragment?: boolean;
  requiresTwelveExercises?: boolean;
  grammarSkills?: SkillLink[];
  exercises?: ExerciseShape[];
};

type LessonShape = {
  id: string;
  curriculumRole?: string | null;
  minimumCompletionScore?: number;
  grammarSkills?: SkillLink[];
  blocks?: BlockShape[];
};

export type GrammarCourseStructure = {
  modules: Array<{
    id: string;
    minimumFinalLessonScore?: number;
    lessons: LessonShape[];
  }>;
};

function hasLinkedSkill(links: SkillLink[] | undefined) {
  return Boolean(links?.some((link) => Boolean(link.grammarSkillId ?? link.id)));
}

function hasMeaningfulContent(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulContent(item));
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((item) => hasMeaningfulContent(item));
}

function hasAnswer(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function grammarLesson(role: string | null | undefined) {
  return role !== undefined && role !== null && role !== "STANDARD";
}

/**
 * Validates the opt-in grammar-course contract without touching database
 * rows. CMS calls this just before lifecycle publication, so a malformed
 * draft never becomes live and existing STANDARD lessons remain unaffected.
 */
export function validateGrammarCourseStructure(course: GrammarCourseStructure): GrammarStructureIssue[] {
  const issues: GrammarStructureIssue[] = [];

  for (const module of course.modules) {
    const grammarLessons = module.lessons.filter((lesson) => grammarLesson(lesson.curriculumRole));
    if (!grammarLessons.length) continue;

    if (module.lessons.length !== 10) {
      issues.push({
        code: "GRAMMAR_MODULE_LESSON_COUNT",
        path: `module:${module.id}`,
        message: "A grammar module must contain exactly 10 lessons: overview, eight development lessons and a final lesson.",
      });
    }
    if (module.lessons[0]?.curriculumRole !== "OVERVIEW") {
      issues.push({ code: "GRAMMAR_MODULE_OVERVIEW", path: `module:${module.id}`, message: "The first lesson in a grammar module must be an overview." });
    }
    if (module.lessons.at(-1)?.curriculumRole !== "FINAL") {
      issues.push({ code: "GRAMMAR_MODULE_FINAL", path: `module:${module.id}`, message: "The tenth lesson in a grammar module must be the integrated final lesson." });
    }
    if ((module.minimumFinalLessonScore ?? 0) < 75) {
      issues.push({ code: "GRAMMAR_MODULE_FINAL_SCORE", path: `module:${module.id}`, message: "A grammar module needs a final-lesson score requirement of at least 75%." });
    }

    for (const lesson of grammarLessons) {
      if ((lesson.minimumCompletionScore ?? 0) < 60) {
        issues.push({ code: "GRAMMAR_LESSON_SCORE", path: `lesson:${lesson.id}`, message: "A grammar lesson needs a completion score requirement of at least 60%." });
      }
      if (!hasLinkedSkill(lesson.grammarSkills)) {
        issues.push({ code: "GRAMMAR_LESSON_SKILL", path: `lesson:${lesson.id}`, message: "Link at least one grammar skill to every grammar lesson." });
      }

      const blocks = lesson.blocks ?? [];
      const fragmentKeys = new Set<string>();
      for (const block of blocks) {
        const key = block.learningFragmentKey?.trim() || "";
        if (block.isLearningFragment) {
          if (!key) issues.push({ code: "GRAMMAR_FRAGMENT_KEY", path: `block:${block.id}`, message: "A learning fragment needs a stable fragment key." });
          else fragmentKeys.add(key);
          if (!block.title?.trim() || !hasMeaningfulContent(block.content)) {
            issues.push({ code: "GRAMMAR_FRAGMENT_EXPLANATION", path: `block:${block.id}`, message: "A learning fragment needs a title and a concise explanation or example." });
          }
          if (!hasLinkedSkill(block.grammarSkills)) {
            issues.push({ code: "GRAMMAR_FRAGMENT_SKILL", path: `block:${block.id}`, message: "Link at least one grammar skill to every learning fragment." });
          }
        }

        if (!block.requiresTwelveExercises) continue;
        if (block.type !== "EXERCISE") {
          issues.push({ code: "GRAMMAR_EXERCISE_BLOCK_TYPE", path: `block:${block.id}`, message: "Only an exercise block can require twelve exercises." });
          continue;
        }
        if (!key) issues.push({ code: "GRAMMAR_EXERCISE_FRAGMENT_KEY", path: `block:${block.id}`, message: "A twelve-exercise block must identify the learning fragment it practises." });
        const exercises = block.exercises ?? [];
        if (exercises.length < 12) {
          issues.push({ code: "GRAMMAR_TWELVE_EXERCISES", path: `block:${block.id}`, message: "Every required grammar practice block needs at least 12 exercises." });
        }
        for (const exercise of exercises) {
          if (!hasAnswer(exercise.correctAnswer)) issues.push({ code: "GRAMMAR_EXERCISE_ANSWER", path: `exercise:${exercise.id}`, message: "Every grammar exercise needs a correct answer." });
          if (!exercise.explanation?.trim()) issues.push({ code: "GRAMMAR_EXERCISE_EXPLANATION", path: `exercise:${exercise.id}`, message: "Every grammar exercise needs an explanation of the correct answer or error." });
          if (!hasLinkedSkill(exercise.grammarSkills)) issues.push({ code: "GRAMMAR_EXERCISE_SKILL", path: `exercise:${exercise.id}`, message: "Link at least one grammar skill to every grammar exercise." });
        }
      }

      for (const key of fragmentKeys) {
        const practice = blocks.find((block) => block.type === "EXERCISE" && block.requiresTwelveExercises && block.learningFragmentKey === key);
        if (!practice) issues.push({ code: "GRAMMAR_FRAGMENT_PRACTICE", path: `lesson:${lesson.id}`, message: `Learning fragment “${key}” needs its linked twelve-exercise practice block.` });
      }
    }
  }

  return issues;
}
