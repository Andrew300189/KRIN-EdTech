/**
 * Fast-but-realistic duration model used by both the CMS timeline and the
 * public course duration. It measures the authored work, not an arbitrary
 * time limit: quick learners should not see a single click treated as a full
 * minute.
 */

type JsonRecord = Record<string, unknown>;

export type DurationExercise = {
  engineKey: string;
  instruction?: string | null;
  question?: string | null;
  content?: unknown;
  correctAnswer?: unknown;
  difficulty?: number | null;
};

export type DurationBlock = {
  type: string;
  title?: string | null;
  content?: unknown;
  settings?: unknown;
  exercises: DurationExercise[];
};

const WORDS_PER_SECOND = 4.2;
const MEDIA_KEYS = new Set([
  "url",
  "src",
  "imageUrl",
  "audioUrl",
  "videoUrl",
  "posterUrl",
  "thumbnailUrl",
]);

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ");
}

export function countLearningWords(value: unknown): number {
  if (typeof value === "string") {
    if (/^(?:data:|https?:\/\/)/i.test(value.trim())) return 0;
    return cleanText(value).match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  }
  if (Array.isArray(value)) return value.reduce((total, item) => total + countLearningWords(item), 0);
  if (value && typeof value === "object") {
    return Object.entries(value as JsonRecord).reduce((total, [key, item]) => (
      MEDIA_KEYS.has(key) || /(?:duration|timeLimit|authoringDuration)/i.test(key)
        ? total
        : total + countLearningWords(item)
    ), 0);
  }
  return 0;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function positiveSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(?::\d{1,2}){1,2}$/.test(trimmed)) {
    return trimmed.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function explicitSeconds(...sources: unknown[]) {
  for (const source of sources) {
    const sourceRecord = record(source);
    for (const key of ["authoringDurationSeconds", "durationSeconds", "mediaDurationSeconds", "audioDurationSeconds", "videoDurationSeconds", "lengthSeconds"]) {
      const value = positiveSeconds(sourceRecord[key]);
      if (value) return Math.min(7_200, Math.max(3, value));
    }
  }
  return null;
}

function wordsSeconds(words: number, minimum = 0) {
  return Math.max(minimum, Math.ceil(words / WORDS_PER_SECOND));
}

function difficultySeconds(difficulty: number | null | undefined) {
  return Math.max(0, Math.min(4, (difficulty ?? 1) - 1)) * 0.85;
}

function gapCount(exercise: DurationExercise, content: JsonRecord) {
  const configured = Math.max(array(content.gaps).length, array(content.blankIds).length);
  if (configured) return configured;
  const text = `${exercise.question ?? ""} ${String(content.authoringSource ?? "")}`;
  return Math.max(1, (text.match(/(?:_{2,}|\[.+?\])/g) ?? []).length);
}

function matchingCount(exercise: DurationExercise, content: JsonRecord) {
  const fromContent = Math.max(array(content.left).length, array(content.right).length);
  const answer = record(exercise.correctAnswer);
  return Math.max(fromContent, Object.keys(answer).length, 1);
}

function optionCount(content: JsonRecord) {
  return Math.max(array(content.options).length, array(content.items).length, 1);
}

/** Returns the time for one learner-facing exercise, in seconds. */
export function estimateExerciseSeconds(exercise: DurationExercise) {
  const content = record(exercise.content);
  const manual = explicitSeconds(content);
  if (manual) return manual;

  const engine = exercise.engineKey.trim().toLowerCase();
  // `authoringSource` mirrors the learner prompt in CMS-created exercises.
  // Count the longer representation once, otherwise a single sentence would
  // make the estimate twice as long merely because it is stored twice.
  const promptWords = countLearningWords(exercise.instruction)
    + Math.max(countLearningWords(exercise.question), countLearningWords(content.authoringSource));
  const optionsWords = countLearningWords(content.options) + countLearningWords(content.left) + countLearningWords(content.right) + countLearningWords(content.items);
  const prompt = wordsSeconds(promptWords, 1);
  const choiceScan = wordsSeconds(optionsWords, 0);
  const options = optionCount(content);
  const difficulty = difficultySeconds(exercise.difficulty);
  let seconds: number;

  switch (engine) {
    case "single-choice":
    case "choice":
    case "true-false-not-given":
      seconds = 2.5 + prompt + choiceScan + Math.min(2.5, options * 0.35) + difficulty;
      break;
    case "multiple-choice":
      seconds = 3.5 + prompt + choiceScan + Math.min(4, options * 0.5) + difficulty;
      break;
    case "text-input":
    case "translation":
      seconds = 5 + prompt + Math.ceil(countLearningWords(exercise.correctAnswer) / 3.6) + difficulty;
      break;
    case "fill-in-the-blanks":
    case "dropdown-gaps": {
      const gaps = gapCount(exercise, content);
      seconds = 2.5 + prompt + gaps * (engine === "dropdown-gaps" ? 2.5 : 4.5) + difficulty;
      break;
    }
    case "sentence-builder":
    case "sorting": {
      const tokens = optionCount(content);
      seconds = 3 + prompt + tokens * 1.25 + difficulty;
      break;
    }
    case "matching":
    case "drag-and-drop":
      seconds = 2.5 + prompt + choiceScan + matchingCount(exercise, content) * 3.2 + difficulty;
      break;
    case "categorization":
      seconds = 3 + prompt + options * 2.4 + choiceScan + difficulty;
      break;
    case "find-and-correct":
      seconds = 5 + prompt + Math.max(1, optionCount(content)) * 2.4 + difficulty;
      break;
    case "highlight-text":
      seconds = 3.5 + prompt + choiceScan + difficulty;
      break;
    case "reading-with-questions":
      seconds = 5 + prompt + choiceScan + Math.max(1, options) * 3.5 + difficulty;
      break;
    case "audio-with-questions":
      seconds = 4 + (explicitSeconds(content) ?? 18) + prompt + Math.max(1, options) * 3.5 + difficulty;
      break;
    case "video-with-questions":
      seconds = 5 + (explicitSeconds(content) ?? 30) + prompt + Math.max(1, options) * 3.5 + difficulty;
      break;
    case "voice-recording":
      seconds = 18 + prompt + difficulty;
      break;
    case "ai-speaking-dialogue":
    case "interactive-dialogue":
      seconds = 24 + prompt + difficulty;
      break;
    case "pronunciation-check":
      seconds = 14 + prompt + difficulty;
      break;
    case "writing-assignment":
    case "teacher-reviewed-assignment":
    case "peer-review":
      seconds = 45 + prompt + difficulty;
      break;
    case "project-assignment":
      seconds = 90 + prompt + difficulty;
      break;
    case "flashcards":
      seconds = 2.7 + prompt + Math.max(0, options - 1) * 2.2 + difficulty;
      break;
    case "timed-quiz":
    case "adaptive-test":
      seconds = 4 + prompt + Math.max(1, options) * 3 + difficulty;
      break;
    case "game-scenario":
      seconds = 18 + prompt + choiceScan + difficulty;
      break;
    case "personal-error-review":
      seconds = 10 + prompt + difficulty;
      break;
    default:
      seconds = 5 + prompt + choiceScan + difficulty;
  }

  return Math.min(900, Math.max(4, Math.round(seconds)));
}

function authoringTheorySeconds(exercises: DurationExercise[]) {
  const context = record(record(exercises[0]?.content).authoringContext);
  const theoryWords = countLearningWords(context.text);
  const reading = theoryWords ? wordsSeconds(theoryWords, 3) + 2 : 0;
  const audio = positiveSeconds(context.audioDurationSeconds) ?? (typeof context.audioUrl === "string" && context.audioUrl.trim() ? 18 : 0);
  const video = positiveSeconds(context.videoDurationSeconds) ?? (typeof context.videoUrl === "string" && context.videoUrl.trim() ? 30 : 0);
  return reading + audio + video;
}

/** Returns the time for a complete learner block, including shared theory once. */
export function estimateBlockSeconds(block: DurationBlock) {
  if (block.exercises.length) {
    return authoringTheorySeconds(block.exercises)
      + block.exercises.reduce((total, exercise) => total + estimateExerciseSeconds(exercise), 0);
  }

  const media = explicitSeconds(block.content, block.settings);
  const words = countLearningWords(block.title) + countLearningWords(block.content) + countLearningWords(block.settings);
  const reading = wordsSeconds(words, 2);
  const type = block.type.toUpperCase();

  if (type === "VIDEO" || type === "LISTENING") return (media ?? (type === "VIDEO" ? 30 : 18)) + reading + 3;
  if (type === "DIALOGUE") return Math.max(8, Math.ceil(words / 3.4) + 3);
  if (type === "HOMEWORK" || type === "DISCUSSION") return Math.max(30, reading + 15);
  if (type === "IMAGE") return Math.max(6, reading + 3);
  if (type === "BREAK") return media ?? 10;
  return Math.max(4, reading + 2);
}

export function estimateLessonSeconds(blocks: DurationBlock[]) {
  return blocks.reduce((total, block) => total + estimateBlockSeconds(block), 0);
}
