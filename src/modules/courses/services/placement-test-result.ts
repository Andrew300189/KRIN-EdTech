export const PLACEMENT_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export const PENDING_PLACEMENT_RESULT_KEY = "krin:placement-test:pending:v1";
export const PLACEMENT_DASHBOARD_PATH = "/student?placement=1";

export type PlacementCefrLevel = (typeof PLACEMENT_LEVELS)[number];

export const PLACEMENT_LEVEL_RANGES: Record<PlacementCefrLevel, [number, number]> = {
  A1: [0, 19],
  A2: [20, 39],
  B1: [40, 59],
  B2: [60, 79],
  C1: [80, 99],
};

export const PLACEMENT_LEVEL_DESCRIPTIONS: Record<PlacementCefrLevel, string> = {
  A1: "Beginner — Can use very basic expressions and introduce themselves.",
  A2: "Elementary — Can communicate in simple, routine tasks.",
  B1: "Intermediate — Can deal with most everyday situations while travelling.",
  B2: "Upper-intermediate — Can interact with a degree of fluency and spontaneity.",
  C1: "Advanced — Can express ideas fluently and use language flexibly.",
};

export type PlacementBreakdownRow = {
  level: PlacementCefrLevel;
  correct: number;
  total: number;
  pct: number;
  attempted: boolean;
};

export type PlacementTestResult = {
  level: PlacementCefrLevel | null;
  belowA1: boolean;
  message: string;
  correctAnswers: number;
  questionCount: number;
  scorePercent: number;
  breakdown: PlacementBreakdownRow[];
};

/** A level is awarded only after 14 of 20 answers are correct in each passed block. */
export function computePlacementLevel(results: readonly boolean[]): PlacementCefrLevel | null {
  const passed: PlacementCefrLevel[] = [];

  for (const level of PLACEMENT_LEVELS) {
    const [from, to] = PLACEMENT_LEVEL_RANGES[level];
    const answers = results.slice(from, to + 1);
    if (answers.length < 20 || answers.filter(Boolean).length < 14) break;
    passed.push(level);
  }

  return passed.at(-1) ?? null;
}

export function computePlacementBreakdown(results: readonly boolean[]): PlacementBreakdownRow[] {
  return PLACEMENT_LEVELS.map((level) => {
    const [from, to] = PLACEMENT_LEVEL_RANGES[level];
    const answers = results.slice(from, to + 1);
    const total = answers.length;
    const correct = answers.filter(Boolean).length;

    return {
      level,
      correct,
      total,
      pct: total ? Math.round((correct / total) * 100) : 0,
      attempted: total > 0,
    };
  });
}

export function getPlacementState(results: readonly boolean[]) {
  const level = computePlacementLevel(results);
  return level
    ? { level, belowA1: false, message: PLACEMENT_LEVEL_DESCRIPTIONS[level] }
    : { level: null, belowA1: true, message: "See you next time" };
}

export function buildPlacementTestResult(results: readonly boolean[]): PlacementTestResult {
  const normalizedResults = results.slice(0, 100);
  const placement = getPlacementState(normalizedResults);
  const correctAnswers = normalizedResults.filter(Boolean).length;
  const questionCount = normalizedResults.length;

  return {
    ...placement,
    correctAnswers,
    questionCount,
    scorePercent: questionCount ? Math.round((correctAnswers / questionCount) * 100) : 0,
    breakdown: computePlacementBreakdown(normalizedResults),
  };
}

export function placementLegacyLevel(level: PlacementCefrLevel | null) {
  if (!level || level === "A1" || level === "A2") return "BEGINNER" as const;
  if (level === "B1") return "INTERMEDIATE" as const;
  return "ADVANCED" as const;
}
