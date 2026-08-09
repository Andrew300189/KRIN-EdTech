/**
 * The platform has thirty technical exercise engines. Teaching variations are
 * definitions (engine + subtype), not independent React components or tables.
 * `key` is the stable value stored in Exercise.engineKey; aliases below keep
 * all content created before the canonical catalogue working.
 */
export const EXERCISE_ENGINES = [
  { key: "single-choice", engine: "SINGLE_CHOICE", title: "Single choice", renderer: "choice", description: "Choose one answer from a finite set." },
  { key: "multiple-choice", engine: "MULTIPLE_CHOICE", title: "Multiple choice", renderer: "choice", description: "Choose every correct answer from a finite set." },
  { key: "true-false-not-given", engine: "TRUE_FALSE_NOT_GIVEN", title: "True / False / Not given", renderer: "choice", description: "Evaluate a statement against supplied material." },
  { key: "text-input", engine: "TEXT_INPUT", title: "Text input", renderer: "text", description: "Check a normalized short written response." },
  { key: "fill-in-the-blanks", engine: "FILL_IN_THE_BLANKS", title: "Fill in the blanks", renderer: "text", description: "Complete one or more gaps in a prompt." },
  { key: "dropdown-gaps", engine: "DROPDOWN_GAPS", title: "Dropdown gaps", renderer: "choice", description: "Choose a token for each defined gap." },
  { key: "drag-and-drop", engine: "DRAG_AND_DROP", title: "Drag and drop", renderer: "word-bank", description: "Place supplied tokens in the required targets." },
  { key: "matching", engine: "MATCHING", title: "Matching", renderer: "matching", description: "Pair items from two lists." },
  { key: "sorting", engine: "SORTING", title: "Sorting", renderer: "classification", description: "Sort items into an ordered or grouped result." },
  { key: "sentence-builder", engine: "SENTENCE_BUILDER", title: "Sentence builder", renderer: "ordering", description: "Build a sentence from tokens." },
  { key: "categorization", engine: "CATEGORIZATION", title: "Categorization", renderer: "classification", description: "Classify items by named categories." },
  { key: "find-and-correct", engine: "FIND_AND_CORRECT", title: "Find and correct", renderer: "text", description: "Locate and repair an error in language input." },
  { key: "highlight-text", engine: "HIGHLIGHT_TEXT", title: "Highlight text", renderer: "hotspot", description: "Select a word, phrase or region in supplied material." },
  { key: "reading-with-questions", engine: "READING_WITH_QUESTIONS", title: "Reading with questions", renderer: "passage", description: "Answer questions linked to a reading passage." },
  { key: "audio-with-questions", engine: "AUDIO_WITH_QUESTIONS", title: "Audio with questions", renderer: "audio-choice", description: "Answer questions linked to audio." },
  { key: "video-with-questions", engine: "VIDEO_WITH_QUESTIONS", title: "Video with questions", renderer: "media", description: "Answer questions linked to video." },
  { key: "voice-recording", engine: "VOICE_RECORDING", title: "Voice recording", renderer: "recording", description: "Record a spoken response for review." },
  { key: "ai-speaking-dialogue", engine: "AI_SPEAKING_DIALOGUE", title: "AI speaking dialogue", renderer: "recording", description: "Run a guided speaking dialogue with AI evaluation capability." },
  { key: "pronunciation-check", engine: "PRONUNCIATION_CHECK", title: "Pronunciation check", renderer: "recording", description: "Compare a recorded response with a pronunciation target." },
  { key: "writing-assignment", engine: "WRITING_ASSIGNMENT", title: "Writing assignment", renderer: "long-text", description: "Submit a longer written response." },
  { key: "translation", engine: "TRANSLATION", title: "Translation", renderer: "text", description: "Translate a word, phrase or sentence." },
  { key: "flashcards", engine: "FLASHCARDS", title: "Flashcards", renderer: "text", description: "Recall an answer from a card prompt." },
  { key: "interactive-dialogue", engine: "INTERACTIVE_DIALOGUE", title: "Interactive dialogue", renderer: "ordering", description: "Build or choose turns in a dialogue." },
  { key: "timed-quiz", engine: "TIMED_QUIZ", title: "Timed quiz", renderer: "steps", description: "Complete a timed sequence of checked questions." },
  { key: "adaptive-test", engine: "ADAPTIVE_TEST", title: "Adaptive test", renderer: "steps", description: "Select subsequent questions from answer performance." },
  { key: "teacher-reviewed-assignment", engine: "TEACHER_REVIEWED_ASSIGNMENT", title: "Teacher-reviewed assignment", renderer: "long-text", description: "Submit work for a teacher review." },
  { key: "peer-review", engine: "PEER_REVIEW", title: "Peer review", renderer: "long-text", description: "Submit work for structured peer review." },
  { key: "project-assignment", engine: "PROJECT_ASSIGNMENT", title: "Project assignment", renderer: "media", description: "Submit a multi-material project." },
  { key: "game-scenario", engine: "GAME_SCENARIO", title: "Game scenario", renderer: "steps", description: "Progress through a scenario with checked choices." },
  { key: "personal-error-review", engine: "PERSONAL_ERROR_REVIEW", title: "Personal error review", renderer: "text", description: "Revisit an individual learner's previous errors." },
] as const;

export type ExerciseEngine = (typeof EXERCISE_ENGINES)[number]["engine"];
export type ExerciseEngineKey = (typeof EXERCISE_ENGINES)[number]["key"];
export type ExerciseRendererKind = (typeof EXERCISE_ENGINES)[number]["renderer"];
export type ExerciseCategory = "GRAMMAR" | "VOCABULARY" | "READING" | "LISTENING" | "SPEAKING" | "WRITING" | "PRONUNCIATION" | "ASSESSMENT" | "REVIEW";
export type AnswerMode = "SINGLE" | "MULTIPLE" | "TEXT" | "MATCHING" | "ORDERING" | "CLASSIFICATION" | "RECORDING" | "LONG_TEXT" | "MEDIA" | "REVIEW";

export type ExerciseDefinition = {
  engine: ExerciseEngine;
  subtype: string;
  title: string;
  category: ExerciseCategory;
  supportedAnswerModes: AnswerMode[];
  supportsAudio: boolean;
  supportsVideo: boolean;
  supportsImages: boolean;
  supportsAiEvaluation: boolean;
  supportsTeacherReview: boolean;
  defaultSettings: Record<string, unknown>;
};

const enginesByKey = new Map<ExerciseEngineKey, (typeof EXERCISE_ENGINES)[number]>(
  EXERCISE_ENGINES.map((engine) => [engine.key, engine]),
);

const engineByCode = new Map<ExerciseEngine, (typeof EXERCISE_ENGINES)[number]>(
  EXERCISE_ENGINES.map((engine) => [engine.engine, engine]),
);

/** Legacy storage keys are normalized at the boundary instead of breaking published lessons. */
const ENGINE_KEY_ALIASES: Record<string, ExerciseEngineKey> = {
  choice: "single-choice",
  "multi-choice": "multiple-choice",
  "true-false": "true-false-not-given",
  cloze: "fill-in-the-blanks",
  "gap-fill": "dropdown-gaps",
  "word-bank": "drag-and-drop",
  ordering: "sentence-builder",
  sorting: "sorting",
  classification: "categorization",
  "error-correction": "find-and-correct",
  "hotspot-image": "highlight-text",
  "reading-comprehension": "reading-with-questions",
  "listening-comprehension": "audio-with-questions",
  "audio-selection": "audio-with-questions",
  "media-response": "video-with-questions",
  "pronunciation-recording": "voice-recording",
  "speaking-prompt": "ai-speaking-dialogue",
  shadowing: "pronunciation-check",
  "writing-response": "writing-assignment",
  "flashcard-recall": "flashcards",
  "dialogue-builder": "interactive-dialogue",
  "multi-step": "timed-quiz",
  "table-completion": "adaptive-test",
  transformation: "personal-error-review",
  dictation: "audio-with-questions",
  "short-answer": "text-input",
};

function definition(
  engine: ExerciseEngine,
  subtype: string,
  title: string,
  category: ExerciseCategory,
  supportedAnswerModes: AnswerMode[],
  options: Partial<Omit<ExerciseDefinition, "engine" | "subtype" | "title" | "category" | "supportedAnswerModes">> = {},
): ExerciseDefinition {
  return {
    engine,
    subtype,
    title,
    category,
    supportedAnswerModes,
    supportsAudio: false,
    supportsVideo: false,
    supportsImages: false,
    supportsAiEvaluation: false,
    supportsTeacherReview: false,
    defaultSettings: {},
    ...options,
  };
}

export const EXERCISE_DEFINITIONS: ExerciseDefinition[] = [
  definition("SINGLE_CHOICE", "ARTICLE_SELECTION", "Article selection", "GRAMMAR", ["SINGLE"]),
  definition("SINGLE_CHOICE", "PREPOSITION_SELECTION", "Preposition selection", "GRAMMAR", ["SINGLE"]),
  definition("SINGLE_CHOICE", "PRONOUN_SELECTION", "Pronoun selection", "GRAMMAR", ["SINGLE"]),
  definition("SINGLE_CHOICE", "SYNONYM_SELECTION", "Synonym selection", "VOCABULARY", ["SINGLE"]),
  definition("SINGLE_CHOICE", "ANTONYM_SELECTION", "Antonym selection", "VOCABULARY", ["SINGLE"]),
  definition("SINGLE_CHOICE", "TRANSLATION_SELECTION", "Translation selection", "VOCABULARY", ["SINGLE"]),
  definition("SINGLE_CHOICE", "CONTEXT_SELECTION", "Context selection", "GRAMMAR", ["SINGLE"]),
  definition("MULTIPLE_CHOICE", "MULTI_SELECT", "Multiple answer selection", "ASSESSMENT", ["MULTIPLE"]),
  definition("TRUE_FALSE_NOT_GIVEN", "STATEMENT_EVALUATION", "Statement evaluation", "READING", ["SINGLE"]),
  definition("TEXT_INPUT", "SHORT_ANSWER", "Short answer", "VOCABULARY", ["TEXT"]),
  definition("FILL_IN_THE_BLANKS", "GAP_FILL", "Gap fill", "GRAMMAR", ["TEXT"]),
  definition("DROPDOWN_GAPS", "DROPDOWN_GAP_FILL", "Dropdown gap fill", "GRAMMAR", ["SINGLE"]),
  definition("DRAG_AND_DROP", "TOKEN_PLACEMENT", "Token placement", "GRAMMAR", ["ORDERING"]),
  definition("MATCHING", "PAIR_MATCHING", "Pair matching", "VOCABULARY", ["MATCHING"]),
  definition("SORTING", "ORDER_SORTING", "Order sorting", "GRAMMAR", ["ORDERING"]),
  definition("SENTENCE_BUILDER", "SENTENCE_ORDER", "Sentence order", "GRAMMAR", ["ORDERING"]),
  definition("CATEGORIZATION", "CATEGORY_SORTING", "Category sorting", "VOCABULARY", ["CLASSIFICATION"]),
  definition("FIND_AND_CORRECT", "ERROR_CORRECTION", "Error correction", "GRAMMAR", ["TEXT"]),
  definition("HIGHLIGHT_TEXT", "TEXT_HIGHLIGHT", "Text highlight", "READING", ["SINGLE"]),
  definition("READING_WITH_QUESTIONS", "READING_COMPREHENSION", "Reading comprehension", "READING", ["SINGLE", "MULTIPLE", "TEXT"]),
  definition("AUDIO_WITH_QUESTIONS", "LISTENING_COMPREHENSION", "Listening comprehension", "LISTENING", ["SINGLE", "MULTIPLE", "TEXT"], { supportsAudio: true }),
  definition("VIDEO_WITH_QUESTIONS", "VIDEO_COMPREHENSION", "Video comprehension", "LISTENING", ["SINGLE", "MULTIPLE", "TEXT"], { supportsVideo: true }),
  definition("VOICE_RECORDING", "SPOKEN_RESPONSE", "Spoken response", "SPEAKING", ["RECORDING"], { supportsAudio: true, supportsTeacherReview: true }),
  definition("AI_SPEAKING_DIALOGUE", "GUIDED_DIALOGUE", "Guided AI dialogue", "SPEAKING", ["RECORDING"], { supportsAudio: true, supportsAiEvaluation: true }),
  definition("PRONUNCIATION_CHECK", "PRONUNCIATION_DRILL", "Pronunciation drill", "PRONUNCIATION", ["RECORDING"], { supportsAudio: true, supportsAiEvaluation: true }),
  definition("WRITING_ASSIGNMENT", "WRITING_RESPONSE", "Writing response", "WRITING", ["LONG_TEXT"], { supportsTeacherReview: true }),
  definition("TRANSLATION", "SENTENCE_TRANSLATION", "Sentence translation", "WRITING", ["TEXT"]),
  definition("FLASHCARDS", "RECALL_CARD", "Recall card", "VOCABULARY", ["TEXT"]),
  definition("INTERACTIVE_DIALOGUE", "DIALOGUE_TURN", "Dialogue turn", "SPEAKING", ["SINGLE", "ORDERING"]),
  definition("TIMED_QUIZ", "TIMED_ASSESSMENT", "Timed assessment", "ASSESSMENT", ["SINGLE", "MULTIPLE", "TEXT"], { defaultSettings: { timeLimitSeconds: 300 } }),
  definition("ADAPTIVE_TEST", "ADAPTIVE_ASSESSMENT", "Adaptive assessment", "ASSESSMENT", ["SINGLE", "MULTIPLE", "TEXT"]),
  definition("TEACHER_REVIEWED_ASSIGNMENT", "TEACHER_REVIEW", "Teacher review", "WRITING", ["LONG_TEXT", "MEDIA"], { supportsTeacherReview: true }),
  definition("PEER_REVIEW", "PEER_FEEDBACK", "Peer feedback", "WRITING", ["LONG_TEXT", "REVIEW"], { supportsTeacherReview: true }),
  definition("PROJECT_ASSIGNMENT", "PROJECT_SUBMISSION", "Project submission", "WRITING", ["LONG_TEXT", "MEDIA"], { supportsAudio: true, supportsVideo: true, supportsImages: true, supportsTeacherReview: true }),
  definition("GAME_SCENARIO", "SCENARIO_PATH", "Scenario path", "ASSESSMENT", ["SINGLE", "MULTIPLE", "TEXT"]),
  definition("PERSONAL_ERROR_REVIEW", "PERSONALIZED_REVIEW", "Personalized error review", "REVIEW", ["TEXT"], { defaultSettings: { source: "learner_mistakes" } }),
];

export const LEGACY_EXERCISE_TYPE_TO_ENGINE = {
  SINGLE_CHOICE: "single-choice",
  MULTIPLE_CHOICE: "multiple-choice",
  TEXT_INPUT: "text-input",
  FILL_IN_THE_BLANK: "fill-in-the-blanks",
  MATCHING: "matching",
  WORD_ORDER: "drag-and-drop",
  SENTENCE_ORDER: "sentence-builder",
  ERROR_CORRECTION: "find-and-correct",
  SENTENCE_TRANSLATION: "translation",
  TENSE_SELECTION: "single-choice",
  TENSE_TRANSFORMATION: "find-and-correct",
  SYNONYM_SELECTION: "single-choice",
  ANTONYM_SELECTION: "single-choice",
  PHRASAL_VERB_MEANING: "single-choice",
  VERB_PREPOSITION: "single-choice",
  TRANSCRIPTION_MATCH: "matching",
  LISTENING_QUESTIONS: "audio-with-questions",
  DICTATION: "audio-with-questions",
  TEXT_RECONSTRUCTION: "fill-in-the-blanks",
  EXTRA_WORDS: "drag-and-drop",
} as const satisfies Record<string, ExerciseEngineKey>;

export function normalizeExerciseEngineKey(value: string | null | undefined): ExerciseEngineKey | null {
  if (!value) return null;
  const candidate = value.trim();
  if (enginesByKey.has(candidate as ExerciseEngineKey)) return candidate as ExerciseEngineKey;
  return ENGINE_KEY_ALIASES[candidate] ?? null;
}

export function isExerciseEngineKey(value: string): value is ExerciseEngineKey {
  return normalizeExerciseEngineKey(value) !== null;
}

export function getExerciseEngine(key: string | null | undefined) {
  const normalized = normalizeExerciseEngineKey(key);
  return normalized ? enginesByKey.get(normalized) ?? null : null;
}

export function getExerciseEngineByCode(engine: ExerciseEngine) {
  return engineByCode.get(engine) ?? null;
}

export function getExerciseDefinitions(engineKey: string | null | undefined) {
  const engine = getExerciseEngine(engineKey);
  return engine ? EXERCISE_DEFINITIONS.filter((definition) => definition.engine === engine.engine) : [];
}

export function getExerciseDefinition(engineKey: string | null | undefined, subtype: string | null | undefined) {
  const definitions = getExerciseDefinitions(engineKey);
  if (!definitions.length) return null;
  return definitions.find((definition) => definition.subtype === subtype) ?? definitions[0];
}

export function getDefaultExerciseSubtype(engineKey: string | null | undefined) {
  return getExerciseDefinition(engineKey, null)?.subtype ?? null;
}

export function resolveExerciseEngineKey(
  engineKey: string | null | undefined,
  legacyType: string,
): ExerciseEngineKey {
  return normalizeExerciseEngineKey(engineKey)
    ?? LEGACY_EXERCISE_TYPE_TO_ENGINE[legacyType as keyof typeof LEGACY_EXERCISE_TYPE_TO_ENGINE]
    ?? "single-choice";
}
