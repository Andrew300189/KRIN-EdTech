"use client";

import Link from "next/link";
import { useCallback, useMemo, useReducer } from "react";
import s from "./PlacementTest.module.css";

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestionType = "single" | "fill";

interface Question {
  id: number;
  type: QuestionType;
  /** For "fill" type the gap is rendered as `___`. */
  prompt: string;
  options: readonly string[];
  answer: string;
}

type Phase = "intro" | "test" | "result";

interface State {
  phase: Phase;
  current: number;
  /** index of the selected option for the current question, -1 = none */
  selected: number;
  /** whether feedback is being shown after selection */
  feedback: boolean;
  /** correct/incorrect per question index */
  results: boolean[];
}

type Action =
  | { type: "START" }
  | { type: "SELECT"; index: number }
  | { type: "NEXT" }
  | { type: "RESTART" };

// ─── Questions bank (100 questions, A1→C1) ────────────────────────────────

const QUESTIONS: Question[] = [
  // ── A1 (1-20) ──────────────────────────────────────────────────────────
  { id: 1,  type: "single", prompt: "What ___ your name?", options: ["is", "are", "am", "be"], answer: "is" },
  { id: 2,  type: "single", prompt: "She ___ a teacher.", options: ["am", "is", "are", "be"], answer: "is" },
  { id: 3,  type: "single", prompt: "They ___ from Spain.", options: ["is", "am", "are", "be"], answer: "are" },
  { id: 4,  type: "single", prompt: "I ___ not hungry.", options: ["is", "am", "are", "do"], answer: "am" },
  { id: 5,  type: "fill",   prompt: "He ___ to school every day.", options: ["go", "goes", "going", "gone"], answer: "goes" },
  { id: 6,  type: "single", prompt: "There ___ two cats on the table.", options: ["is", "am", "are", "were"], answer: "are" },
  { id: 7,  type: "single", prompt: "Which article fits? '___ apple.'", options: ["A", "An", "The", "—"], answer: "An" },
  { id: 8,  type: "fill",   prompt: "___ you speak English?", options: ["Do", "Does", "Are", "Is"], answer: "Do" },
  { id: 9,  type: "single", prompt: "We ___ TV every evening.", options: ["watch", "watches", "watching", "watched"], answer: "watch" },
  { id: 10, type: "single", prompt: "The plural of 'child' is ___.", options: ["childs", "childes", "children", "childrens"], answer: "children" },
  { id: 11, type: "fill",   prompt: "She ___ coffee in the morning.", options: ["drink", "drinks", "drinking", "drank"], answer: "drinks" },
  { id: 12, type: "single", prompt: "My brother ___ fifteen years old.", options: ["have", "is", "has", "are"], answer: "is" },
  { id: 13, type: "single", prompt: "It is ___ o'clock.", options: ["three", "third", "threes", "thirteenth"], answer: "three" },
  { id: 14, type: "fill",   prompt: "I ___ a pen. Can I use yours?", options: ["haven't", "don't have", "no have", "hasn't"], answer: "don't have" },
  { id: 15, type: "single", prompt: "What colour ___ the sky?", options: ["is", "are", "am", "be"], answer: "is" },
  { id: 16, type: "single", prompt: "'___ is your bag?' 'It's red.'", options: ["How", "What colour", "Where", "Who"], answer: "What colour" },
  { id: 17, type: "fill",   prompt: "I live ___ London.", options: ["in", "at", "on", "by"], answer: "in" },
  { id: 18, type: "single", prompt: "They ___ football on Saturdays.", options: ["plays", "playing", "play", "played"], answer: "play" },
  { id: 19, type: "fill",   prompt: "There ___ a book on the table.", options: ["is", "are", "am", "be"], answer: "is" },
  { id: 20, type: "single", prompt: "How ___ brothers do you have?", options: ["many", "much", "long", "often"], answer: "many" },

  // ── A2 (21-40) ─────────────────────────────────────────────────────────
  { id: 21, type: "single", prompt: "She ___ to Paris last year.", options: ["go", "gone", "goes", "went"], answer: "went" },
  { id: 22, type: "fill",   prompt: "I was ___ the library when you called.", options: ["in", "at", "on", "near"], answer: "at" },
  { id: 23, type: "single", prompt: "They ___ watching TV when I arrived.", options: ["are", "were", "was", "be"], answer: "were" },
  { id: 24, type: "single", prompt: "He ___ already eaten when we got there.", options: ["has", "have", "had", "was"], answer: "had" },
  { id: 25, type: "fill",   prompt: "We ___ go to the cinema tomorrow.", options: ["are going to", "went to", "go to", "was going"], answer: "are going to" },
  { id: 26, type: "single", prompt: "She is ___ than her sister.", options: ["tall", "taller", "tallest", "more tall"], answer: "taller" },
  { id: 27, type: "fill",   prompt: "I have lived here ___ five years.", options: ["since", "for", "ago", "during"], answer: "for" },
  { id: 28, type: "single", prompt: "How ___ does the train ticket cost?", options: ["many", "much", "often", "long"], answer: "much" },
  { id: 29, type: "fill",   prompt: "He ___ never been to Japan.", options: ["has", "have", "had", "is"], answer: "has" },
  { id: 30, type: "single", prompt: "We didn't ___ any help.", options: ["need", "needed", "needs", "needing"], answer: "need" },
  { id: 31, type: "fill",   prompt: "She ___ her homework before dinner yesterday.", options: ["finish", "finished", "finishes", "finishing"], answer: "finished" },
  { id: 32, type: "single", prompt: "They ___ swim, but they can't ski.", options: ["can", "could", "must", "should"], answer: "can" },
  { id: 33, type: "fill",   prompt: "I ___ like some water, please.", options: ["would", "will", "shall", "should"], answer: "would" },
  { id: 34, type: "single", prompt: "It is ___ city in the country.", options: ["the biggest", "bigger", "biggest", "a bigger"], answer: "the biggest" },
  { id: 35, type: "fill",   prompt: "He works ___ a nurse in a hospital.", options: ["as", "like", "for", "in"], answer: "as" },
  { id: 36, type: "single", prompt: "'___ long have you known her?' 'About ten years.'", options: ["How", "What", "Which", "When"], answer: "How" },
  { id: 37, type: "fill",   prompt: "We met ___ 2019.", options: ["in", "at", "on", "since"], answer: "in" },
  { id: 38, type: "single", prompt: "She ___ be at home — her car is outside.", options: ["must", "should", "might", "would"], answer: "must" },
  { id: 39, type: "fill",   prompt: "I go to the gym ___ week.", options: ["every", "all", "each", "once"], answer: "every" },
  { id: 40, type: "single", prompt: "The film was ___ interesting ___ I watched it twice.", options: ["so / that", "such / that", "too / to", "very / that"], answer: "so / that" },

  // ── B1 (41-60) ─────────────────────────────────────────────────────────
  { id: 41, type: "single", prompt: "If I had more time, I ___ learn the guitar.", options: ["will", "would", "should", "can"], answer: "would" },
  { id: 42, type: "fill",   prompt: "The report ___ by the team last week.", options: ["wrote", "was written", "has written", "is writing"], answer: "was written" },
  { id: 43, type: "single", prompt: "She suggested ___ to the museum.", options: ["to go", "going", "go", "gone"], answer: "going" },
  { id: 44, type: "fill",   prompt: "He ___ working here for ten years.", options: ["has been", "had been", "is", "was"], answer: "has been" },
  { id: 45, type: "single", prompt: "I wish I ___ taller.", options: ["am", "was / were", "will be", "have been"], answer: "was / were" },
  { id: 46, type: "fill",   prompt: "Despite ___ tired, she finished the race.", options: ["being", "be", "is", "was"], answer: "being" },
  { id: 47, type: "single", prompt: "By 9 a.m. she ___ already left the office.", options: ["has", "had", "have", "was"], answer: "had" },
  { id: 48, type: "fill",   prompt: "He asked me where I ___ from.", options: ["was", "were", "am", "be"], answer: "was" },
  { id: 49, type: "single", prompt: "You ___ smoke here — it's forbidden.", options: ["mustn't", "needn't", "don't have to", "shouldn't"], answer: "mustn't" },
  { id: 50, type: "fill",   prompt: "I'm used to ___ early.", options: ["getting up", "get up", "got up", "gets up"], answer: "getting up" },
  { id: 51, type: "single", prompt: "He managed ___ the exam on his first attempt.", options: ["to pass", "passing", "pass", "passed"], answer: "to pass" },
  { id: 52, type: "fill",   prompt: "The book, ___ was published in 1985, is still popular.", options: ["which", "that", "who", "what"], answer: "which" },
  { id: 53, type: "single", prompt: "Not only ___ late, but he also forgot his report.", options: ["was he", "he was", "he is", "is he"], answer: "was he" },
  { id: 54, type: "fill",   prompt: "She had her car ___ last Monday.", options: ["serviced", "service", "to service", "servicing"], answer: "serviced" },
  { id: 55, type: "single", prompt: "You look tired. You ___ take a break.", options: ["ought to", "must", "shall", "will"], answer: "ought to" },
  { id: 56, type: "fill",   prompt: "I'd rather ___ at home tonight.", options: ["stay", "to stay", "staying", "stayed"], answer: "stay" },
  { id: 57, type: "single", prompt: "The bridge ___ next year, according to the plan.", options: ["will complete", "will be completed", "is completing", "completes"], answer: "will be completed" },
  { id: 58, type: "fill",   prompt: "He denied ___ the money.", options: ["taking", "to take", "take", "taken"], answer: "taking" },
  { id: 59, type: "single", prompt: "'There was no point ___ there.'", options: ["in going", "to go", "going", "go"], answer: "in going" },
  { id: 60, type: "fill",   prompt: "She ___ the piano when I arrived.", options: ["was playing", "played", "has played", "is playing"], answer: "was playing" },

  // ── B2 (61-80) ─────────────────────────────────────────────────────────
  { id: 61, type: "single", prompt: "Had I known earlier, I ___ differently.", options: ["would behave", "would have behaved", "had behaved", "will behave"], answer: "would have behaved" },
  { id: 62, type: "fill",   prompt: "It is essential that he ___ on time.", options: ["is", "be", "was", "were"], answer: "be" },
  { id: 63, type: "single", prompt: "Choose the correct collocation: 'make ___'.", options: ["a mistake", "a travel", "sport", "an exercise"], answer: "a mistake" },
  { id: 64, type: "fill",   prompt: "The proposal was ___ by the board.", options: ["turned down", "turned up", "turned in", "turned over"], answer: "turned down" },
  { id: 65, type: "single", prompt: "Seldom ___ such a performance.", options: ["I have seen", "have I seen", "I saw", "saw I"], answer: "have I seen" },
  { id: 66, type: "fill",   prompt: "She speaks French, ___ comes as a surprise.", options: ["which", "that", "who", "what"], answer: "which" },
  { id: 67, type: "single", prompt: "The report needs ___ before submission.", options: ["proofreading", "to proofread", "proofreaded", "be proofread"], answer: "proofreading" },
  { id: 68, type: "fill",   prompt: "He is ___ up with the noise.", options: ["fed", "full", "had", "put"], answer: "fed" },
  { id: 69, type: "single", prompt: "I'd sooner you ___ that to him directly.", options: ["say", "said", "would say", "have said"], answer: "said" },
  { id: 70, type: "fill",   prompt: "___ be made clear that this policy is final.", options: ["It should", "There should", "This should", "One should"], answer: "It should" },
  { id: 71, type: "single", prompt: "The word 'incessant' is closest in meaning to ___.", options: ["occasional", "constant", "brief", "sudden"], answer: "constant" },
  { id: 72, type: "fill",   prompt: "She came across ___ interesting article.", options: ["an", "a", "the", "—"], answer: "an" },
  { id: 73, type: "single", prompt: "The students, ___ had studied abroad, performed best.", options: ["many of whom", "many of which", "many of them", "many who"], answer: "many of whom" },
  { id: 74, type: "fill",   prompt: "He ___ a fortune on that investment.", options: ["lost", "missed", "wasted", "spent"], answer: "lost" },
  { id: 75, type: "single", prompt: "'The contract was drawn ___ by our legal team.'", options: ["up", "out", "in", "off"], answer: "up" },
  { id: 76, type: "fill",   prompt: "Not until she left ___ realise his mistake.", options: ["did he", "he did", "had he", "has he"], answer: "did he" },
  { id: 77, type: "single", prompt: "The phrase 'to beat around the bush' means ___.", options: ["to avoid the main topic", "to work outdoors", "to speak very loudly", "to make a decision quickly"], answer: "to avoid the main topic" },
  { id: 78, type: "fill",   prompt: "She was on the ___ of tears after the news.", options: ["verge", "edge", "brink", "point"], answer: "verge" },
  { id: 79, type: "single", prompt: "Which sentence is grammatically correct?", options: ["She insisted that he should leave.", "She insisted that he leaves.", "She insisted that he left.", "She insisted that he is leaving."], answer: "She insisted that he should leave." },
  { id: 80, type: "fill",   prompt: "Despite ___ hard, they didn't win.", options: ["trying", "tried", "try", "to try"], answer: "trying" },

  // ── C1 (81-100) ────────────────────────────────────────────────────────
  { id: 81,  type: "single", prompt: "The subjunctive mood is used correctly in: ___.", options: ["I wish I was taller.", "I wish I were taller.", "I wish I am taller.", "I wish I will be taller."], answer: "I wish I were taller." },
  { id: 82,  type: "fill",   prompt: "Her arguments were ___ — impossible to challenge.", options: ["irrefutable", "irresistible", "irreversible", "irregular"], answer: "irrefutable" },
  { id: 83,  type: "single", prompt: "Choose the sentence with a correct cleft structure.", options: ["It was John who broke the window.", "It was John that broke window.", "It is John who breaks the window last year.", "It was John which broke the window."], answer: "It was John who broke the window." },
  { id: 84,  type: "fill",   prompt: "The new regulations will ___ effect from January.", options: ["take", "make", "do", "have"], answer: "take" },
  { id: 85,  type: "single", prompt: "'Eponymous' means ___.", options: ["giving one's name to something", "speaking in metaphors", "describing a tragedy", "using irony"], answer: "giving one's name to something" },
  { id: 86,  type: "fill",   prompt: "The merger fell ___ due to regulatory concerns.", options: ["through", "over", "apart", "behind"], answer: "through" },
  { id: 87,  type: "single", prompt: "She spoke with great ___, choosing every word carefully.", options: ["circumspection", "circumference", "circumstance", "circulation"], answer: "circumspection" },
  { id: 88,  type: "fill",   prompt: "The legislation was passed, ___ much controversy.", options: ["despite", "although", "however", "nevertheless"], answer: "despite" },
  { id: 89,  type: "single", prompt: "Select the correct inversion: 'Only after she left ___.'", options: ["did the meeting start", "the meeting started", "the meeting did start", "started the meeting"], answer: "did the meeting start" },
  { id: 90,  type: "fill",   prompt: "He ___ no stone unturned in his search.", options: ["left", "kept", "made", "turned"], answer: "left" },
  { id: 91,  type: "single", prompt: "The report was ___ with technical jargon.", options: ["replete", "replace", "replete", "replenished"], answer: "replete" },
  { id: 92,  type: "fill",   prompt: "Far ___ the truth, his account was entirely fabricated.", options: ["from", "off", "away", "beyond"], answer: "from" },
  { id: 93,  type: "single", prompt: "'Tendentious' writing is writing that ___.", options: ["promotes a particular viewpoint", "is technically precise", "is emotionally neutral", "uses complex metaphors"], answer: "promotes a particular viewpoint" },
  { id: 94,  type: "fill",   prompt: "She was appointed ___ the new director of the institute.", options: ["as", "like", "to be", "for"], answer: "as" },
  { id: 95,  type: "single", prompt: "Which is an example of a nominalization?", options: ["the investigation of the findings", "they investigated the findings", "to investigate findings", "investigating the findings quickly"], answer: "the investigation of the findings" },
  { id: 96,  type: "fill",   prompt: "The ___ effect of the crisis was a collapse in consumer confidence.", options: ["cumulative", "accumulative", "culminative", "cumulative"], answer: "cumulative" },
  { id: 97,  type: "single", prompt: "In academic writing, 'notwithstanding' is used to mean ___.", options: ["despite / in spite of", "because of", "as a result of", "in addition to"], answer: "despite / in spite of" },
  { id: 98,  type: "fill",   prompt: "The committee reached a ___ decision after hours of debate.", options: ["unanimous", "unique", "uniform", "universal"], answer: "unanimous" },
  { id: 99,  type: "single", prompt: "Which sentence uses a participle clause correctly?", options: ["Having submitted the report, she felt relieved.", "Submitted the report, she felt relieved.", "Having been submitted the report, she felt.", "After submitted the report she felt relieved."], answer: "Having submitted the report, she felt relieved." },
  { id: 100, type: "fill",   prompt: "The initiative was ___ as a direct response to the crisis.", options: ["conceived", "perceived", "deceived", "received"], answer: "conceived" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
type CefrLevel = (typeof LEVELS)[number];

const LEVEL_RANGES: Record<CefrLevel, [number, number]> = {
  A1: [0, 19],
  A2: [20, 39],
  B1: [40, 59],
  B2: [60, 79],
  C1: [80, 99],
};

const LEVEL_DESCRIPTIONS: Record<CefrLevel, string> = {
  A1: "Beginner — Can use very basic expressions and introduce themselves.",
  A2: "Elementary — Can communicate in simple, routine tasks.",
  B1: "Intermediate — Can deal with most everyday situations while travelling.",
  B2: "Upper-intermediate — Can interact with a degree of fluency and spontaneity.",
  C1: "Advanced — Can express ideas fluently and use language flexibly.",
};

// ─── Pure helpers ────────────────────────────────────────────────────────────

function computeLevel(results: boolean[]): CefrLevel {
  // Find the highest level where the user scored ≥ 60%
  const byLevel: Record<CefrLevel, { correct: number; total: number }> = {
    A1: { correct: 0, total: 0 },
    A2: { correct: 0, total: 0 },
    B1: { correct: 0, total: 0 },
    B2: { correct: 0, total: 0 },
    C1: { correct: 0, total: 0 },
  };
  results.forEach((ok, i) => {
    const level = (Object.keys(LEVEL_RANGES) as CefrLevel[]).find(
      (l) => i >= LEVEL_RANGES[l][0] && i <= LEVEL_RANGES[l][1],
    );
    if (!level) return;
    byLevel[level].total++;
    if (ok) byLevel[level].correct++;
  });
  const passed: CefrLevel[] = [];
  for (const lvl of LEVELS) {
    const { correct, total } = byLevel[lvl];
    if (total > 0 && correct / total >= 0.6) passed.push(lvl);
  }
  return passed.length ? passed[passed.length - 1] : "A1";
}

function computeBreakdown(results: boolean[]) {
  return (Object.keys(LEVEL_RANGES) as CefrLevel[]).map((level) => {
    const [from, to] = LEVEL_RANGES[level];
    const slice = results.slice(from, to + 1);
    const correct = slice.filter(Boolean).length;
    return { level, correct, total: slice.length, pct: Math.round((correct / slice.length) * 100) };
  });
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function init(): State {
  return { phase: "intro", current: 0, selected: -1, feedback: false, results: [] };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      return { ...init(), phase: "test" };
    case "SELECT":
      if (state.feedback) return state;
      return { ...state, selected: action.index, feedback: true };
    case "NEXT": {
      const correct = state.selected !== -1 &&
        QUESTIONS[state.current].options[state.selected] === QUESTIONS[state.current].answer;
      const newResults = [...state.results, correct];
      const isLast = state.current === QUESTIONS.length - 1;
      return {
        ...state,
        results: newResults,
        current: isLast ? state.current : state.current + 1,
        selected: -1,
        feedback: false,
        phase: isLast ? "result" : "test",
      };
    }
    case "RESTART":
      return init();
    default:
      return state;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

/** Self-contained English Level Placement Test – replaces InteractiveExercisePreview. */
export function PlacementTest() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const { phase, current, selected, feedback, results } = state;

  const q = QUESTIONS[current];
  const progress = phase === "result" ? 100 : Math.round((current / QUESTIONS.length) * 100);

  const activeLevel = useMemo(
    () =>
      (Object.keys(LEVEL_RANGES) as CefrLevel[]).find(
        (l) => current >= LEVEL_RANGES[l][0] && current <= LEVEL_RANGES[l][1],
      ) ?? "A1",
    [current],
  );

  const correctIndex = useMemo(
    () => (q ? q.options.findIndex((o) => o === q.answer) : -1),
    [q],
  );

  const handleSelect = useCallback(
    (i: number) => dispatch({ type: "SELECT", index: i }),
    [],
  );

  const handleNext = useCallback(() => dispatch({ type: "NEXT" }), []);

  // ── Render helpers ──────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <div className={s.ptWrap}>
        <div className={s.ptCard}>
          <div className={s.ptIntro}>
            <span className={s.ptIntroIcon}>🎯</span>
            <h2 className={s.ptIntroTitle}>English Level Placement Test</h2>
            <p className={s.ptIntroDesc}>
              Discover your CEFR level in minutes. Answer 100 questions ranging
              from A1 to C1 and get a detailed breakdown of your strengths and
              areas to improve.
            </p>
            <div className={s.ptIntroMeta}>
              <span className={s.ptIntroChip}>📝 100 questions</span>
              <span className={s.ptIntroChip}>🏆 A1 → C1</span>
              <span className={s.ptIntroChip}>⏱ ~12 minutes</span>
            </div>
            <button
              type="button"
              className={`${s.ptBtn} ${s.ptBtnPrimary}`}
              onClick={() => dispatch({ type: "START" })}
            >
              Start the test
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const level = computeLevel(results);
    const breakdown = computeBreakdown(results);
    const strengths = breakdown.filter((b) => b.pct >= 60).map((b) => b.level);
    const weaknesses = breakdown.filter((b) => b.pct < 60).map((b) => b.level);
    const totalCorrect = results.filter(Boolean).length;

    return (
      <div className={s.ptWrap}>
        <div className={s.ptCard}>
          <div className={s.ptProgressTrack}>
            <div className={s.ptProgressFill} style={{ width: "100%" }} />
          </div>
          <div className={s.ptResult}>
            <div className={s.ptResultHeader}>
              <div className={s.ptResultLevel}>{level}</div>
              <h2 className={s.ptResultTitle}>Your level: {level}</h2>
              <p className={s.ptResultSub}>
                {LEVEL_DESCRIPTIONS[level]}
              </p>
              <p className={s.ptResultSub} style={{ marginTop: 6 }}>
                <strong style={{ color: "#1e293b" }}>{totalCorrect} / 100</strong> correct answers
              </p>
            </div>

            <div className={s.ptScoreGrid}>
              {breakdown.map(({ level: lvl, correct, total, pct }) => (
                <div key={lvl} className={s.ptScoreRow}>
                  <span className={s.ptScoreLabel}>{lvl}</span>
                  <div className={s.ptScoreTrack}>
                    <div
                      className={`${s.ptScoreBar} ${pct < 60 ? s.ptScoreBarWeak : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={s.ptScoreNum}>{correct}/{total}</span>
                </div>
              ))}
            </div>

            {(strengths.length > 0 || weaknesses.length > 0) && (
              <div className={s.ptTags}>
                {strengths.map((l) => (
                  <span key={l} className={`${s.ptTag} ${s.ptTagStrong}`}>
                    ✓ Strong at {l}
                  </span>
                ))}
                {weaknesses.map((l) => (
                  <span key={l} className={`${s.ptTag} ${s.ptTagWeak}`}>
                    ✗ Review {l}
                  </span>
                ))}
              </div>
            )}

            <div className={s.ptCta}>
              <Link
                href={`/levels/${level.toLowerCase()}`}
                className={`${s.ptCtaBtn} ${s.ptCtaBtnPrimary}`}
              >
                🚀 Explore {level} courses
              </Link>
              <button
                type="button"
                className={`${s.ptCtaBtn} ${s.ptCtaBtnSecondary}`}
                onClick={() => dispatch({ type: "RESTART" })}
              >
                ↺ Retake the test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Test phase ───────────────────────────────────────────────────────────
  return (
    <div className={s.ptWrap}>
      <div className={s.ptCard}>
        {/* Progress bar */}
        <div className={s.ptProgressTrack}>
          <div className={s.ptProgressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Level strip */}
        <div className={s.ptLevelStrip}>
          {LEVELS.map((l) => (
            <div
              key={l}
              className={`${s.ptLevelPip} ${
                l === activeLevel
                  ? s.ptLevelPipActive
                  : LEVELS.indexOf(l) < LEVELS.indexOf(activeLevel)
                  ? s.ptLevelPipDone
                  : ""
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <div className={s.ptHeader}>
          <div className={s.ptBadge}>
            <span className={s.ptBadgeDot} />
            {activeLevel}
          </div>
          <span className={s.ptCounter}>
            <span className={s.ptCounterBold}>{current + 1}</span> / {QUESTIONS.length}
          </span>
        </div>

        {/* Question */}
        <div className={s.ptBody}>
          <p className={s.ptLevelLabel}>{activeLevel} · Question {current + 1}</p>
          <div className={s.ptQuestion} key={current}>
            <p className={s.ptQuestionText}>
              {q.prompt.split("___").map((part, i, arr) =>
                i < arr.length - 1 ? (
                  <span key={i}>
                    {part}
                    <span className={s.ptGap}>___</span>
                  </span>
                ) : (
                  part
                ),
              )}
            </p>

            <div className={s.ptOptions} role="listbox" aria-label="Answer options">
              {q.options.map((opt, i) => {
                let cls = s.ptOption;
                if (feedback) {
                  if (i === correctIndex) cls = `${s.ptOption} ${s.ptOptionCorrect}`;
                  else if (i === selected && i !== correctIndex) cls = `${s.ptOption} ${s.ptOptionWrong}`;
                } else if (i === selected) {
                  cls = `${s.ptOption} ${s.ptOptionSelected}`;
                }
                const marker = String.fromCharCode(65 + i);
                return (
                  <button
                    key={i}
                    type="button"
                    role="option"
                    aria-selected={i === selected}
                    className={cls}
                    onClick={() => handleSelect(i)}
                    disabled={feedback}
                  >
                    <span className={s.ptOptionMarker}>{marker}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={s.ptFooter}>
          <button
            type="button"
            className={`${s.ptBtn} ${s.ptBtnPrimary}`}
            onClick={handleNext}
            disabled={!feedback}
          >
            {current === QUESTIONS.length - 1 ? "See my results →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
