"use client";

import Link from "next/link";
import { useCallback, useMemo, useReducer } from "react";
import s from "./PlacementTest.module.css";

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestionType = "multiple_choice" | "fill_the_gaps" | "sentence_builder";

interface Question {
  id: number;
  type: QuestionType;
  prompt: string;
  /** multiple_choice / fill_the_gaps */
  options?: readonly string[];
  /** Exact correct answer; for sentence_builder this is the assembled sentence */
  answer: string;
  /** sentence_builder word chips (scrambled) */
  words?: readonly string[];
}

interface ModalContent {
  emoji: string;
  title: string;
  message: string;
  cta: string;
}

type Phase = "intro" | "test" | "result";

interface State {
  phase: Phase;
  current: number;
  /** selected option index; -1 = none */
  selected: number;
  /** ordered slot-indices for sentence_builder */
  builderOrder: number[];
  feedback: boolean;
  results: boolean[];
  modal: ModalContent | null;
  afterModal: "continue" | "result" | null;
}

type Action =
  | { type: "START" }
  | { type: "SELECT"; index: number }
  | { type: "BUILDER_TOGGLE"; slotIdx: number }
  | { type: "BUILDER_CLEAR" }
  | { type: "CHECK_BUILDER" }
  | { type: "NEXT" }
  | { type: "FINISH" }
  | { type: "DISMISS_MODAL" }
  | { type: "RESTART" };

// ─── Question bank (100 questions, A1→C1) ────────────────────────────────

const QUESTIONS: Question[] = [
  // ── A1  qs 1–20  (index 0–19) ─────────────────────────────────────
  { id: 1,  type: "multiple_choice", prompt: "What ___ your name?",            options: ["is", "are", "am", "be"],                answer: "is" },
  { id: 2,  type: "multiple_choice", prompt: "She ___ a teacher.",              options: ["am", "is", "are", "be"],                answer: "is" },
  { id: 3,  type: "multiple_choice", prompt: "They ___ from Spain.",            options: ["is", "am", "are", "be"],                answer: "are" },
  { id: 4,  type: "multiple_choice", prompt: "I ___ not hungry.",               options: ["is", "am", "are", "do"],                answer: "am" },
  { id: 5,  type: "fill_the_gaps",   prompt: "He ___ to school every day.",     options: ["go", "goes", "going", "gone"],           answer: "goes" },
  { id: 6,  type: "multiple_choice", prompt: "There ___ two cats on the table.",options: ["is", "am", "are", "were"],              answer: "are" },
  { id: 7,  type: "multiple_choice", prompt: "Which article fits? '___ apple.'",options: ["A", "An", "The", "\u2014"],              answer: "An" },
  { id: 8,  type: "fill_the_gaps",   prompt: "___ you speak English?",          options: ["Do", "Does", "Are", "Is"],              answer: "Do" },
  { id: 9,  type: "multiple_choice", prompt: "We ___ TV every evening.",        options: ["watch", "watches", "watching", "watched"], answer: "watch" },
  { id: 10, type: "sentence_builder", prompt: "Put the words in the correct order.",
    words: ["school", "I", "every", "go", "day", "to"], answer: "I go to school every day" },
  { id: 11, type: "fill_the_gaps",   prompt: "She ___ coffee in the morning.",  options: ["drink", "drinks", "drinking", "drank"], answer: "drinks" },
  { id: 12, type: "multiple_choice", prompt: "My brother ___ fifteen years old.",options: ["have", "is", "has", "are"],            answer: "is" },
  { id: 13, type: "multiple_choice", prompt: "It is ___ o'clock.",              options: ["three", "third", "threes", "thirteenth"], answer: "three" },
  { id: 14, type: "fill_the_gaps",   prompt: "I ___ a pen. Can I use yours?",   options: ["haven't", "don't have", "no have", "hasn't"], answer: "don't have" },
  { id: 15, type: "multiple_choice", prompt: "What colour ___ the sky?",        options: ["is", "are", "am", "be"],                answer: "is" },
  { id: 16, type: "sentence_builder", prompt: "Put the words in the correct order to form a question.",
    words: ["bag", "colour", "What", "your", "is"], answer: "What colour is your bag" },
  { id: 17, type: "fill_the_gaps",   prompt: "I live ___ London.",              options: ["in", "at", "on", "by"],                 answer: "in" },
  { id: 18, type: "multiple_choice", prompt: "They ___ football on Saturdays.", options: ["plays", "playing", "play", "played"],   answer: "play" },
  { id: 19, type: "fill_the_gaps",   prompt: "There ___ a book on the table.",  options: ["is", "are", "am", "be"],                answer: "is" },
  { id: 20, type: "multiple_choice", prompt: "How ___ brothers do you have?",   options: ["many", "much", "long", "often"],        answer: "many" },

  // ── A2  qs 21–40  (index 20–39) ───────────────────────────────────
  { id: 21, type: "multiple_choice", prompt: "She ___ to Paris last year.",     options: ["go", "gone", "goes", "went"],           answer: "went" },
  { id: 22, type: "fill_the_gaps",   prompt: "I was ___ the library when you called.", options: ["in", "at", "on", "near"],       answer: "at" },
  { id: 23, type: "multiple_choice", prompt: "They ___ watching TV when I arrived.", options: ["are", "were", "was", "be"],       answer: "were" },
  { id: 24, type: "multiple_choice", prompt: "He ___ already eaten when we got there.", options: ["has", "have", "had", "was"],   answer: "had" },
  { id: 25, type: "fill_the_gaps",   prompt: "We ___ go to the cinema tomorrow.", options: ["are going to", "went to", "go to", "was going"], answer: "are going to" },
  { id: 26, type: "multiple_choice", prompt: "She is ___ than her sister.",     options: ["tall", "taller", "tallest", "more tall"], answer: "taller" },
  { id: 27, type: "fill_the_gaps",   prompt: "I have lived here ___ five years.", options: ["since", "for", "ago", "during"],    answer: "for" },
  { id: 28, type: "multiple_choice", prompt: "How ___ does the train ticket cost?", options: ["many", "much", "often", "long"],  answer: "much" },
  { id: 29, type: "fill_the_gaps",   prompt: "He ___ never been to Japan.",     options: ["has", "have", "had", "is"],             answer: "has" },
  { id: 30, type: "sentence_builder", prompt: "Put the words in the correct order.",
    words: ["need", "We", "any", "did", "not", "help"], answer: "We did not need any help" },
  { id: 31, type: "fill_the_gaps",   prompt: "She ___ her homework before dinner yesterday.", options: ["finish", "finished", "finishes", "finishing"], answer: "finished" },
  { id: 32, type: "multiple_choice", prompt: "They ___ swim, but they can't ski.", options: ["can", "could", "must", "should"],  answer: "can" },
  { id: 33, type: "fill_the_gaps",   prompt: "I ___ like some water, please.", options: ["would", "will", "shall", "should"],     answer: "would" },
  { id: 34, type: "multiple_choice", prompt: "It is ___ city in the country.", options: ["the biggest", "bigger", "biggest", "a bigger"], answer: "the biggest" },
  { id: 35, type: "fill_the_gaps",   prompt: "He works ___ a nurse in a hospital.", options: ["as", "like", "for", "in"],        answer: "as" },
  { id: 36, type: "sentence_builder", prompt: "Put the words in the correct order to form a question.",
    words: ["you", "known", "How", "have", "long", "her"], answer: "How long have you known her" },
  { id: 37, type: "fill_the_gaps",   prompt: "We met ___ 2019.",                options: ["in", "at", "on", "since"],              answer: "in" },
  { id: 38, type: "multiple_choice", prompt: "She ___ be at home — her car is outside.", options: ["must", "should", "might", "would"], answer: "must" },
  { id: 39, type: "fill_the_gaps",   prompt: "I go to the gym ___ week.",       options: ["every", "all", "each", "once"],         answer: "every" },
  { id: 40, type: "multiple_choice", prompt: "The film was ___ interesting ___ I watched it twice.", options: ["so / that", "such / that", "too / to", "very / that"], answer: "so / that" },

  // ── B1  qs 41–60  (index 40–59) ───────────────────────────────────
  { id: 41, type: "multiple_choice", prompt: "If I had more time, I ___ learn the guitar.", options: ["will", "would", "should", "can"], answer: "would" },
  { id: 42, type: "fill_the_gaps",   prompt: "The report ___ by the team last week.", options: ["wrote", "was written", "has written", "is writing"], answer: "was written" },
  { id: 43, type: "multiple_choice", prompt: "She suggested ___ to the museum.", options: ["to go", "going", "go", "gone"],        answer: "going" },
  { id: 44, type: "fill_the_gaps",   prompt: "He ___ working here for ten years.", options: ["has been", "had been", "is", "was"], answer: "has been" },
  { id: 45, type: "multiple_choice", prompt: "I wish I ___ taller.",            options: ["am", "was / were", "will be", "have been"], answer: "was / were" },
  { id: 46, type: "fill_the_gaps",   prompt: "Despite ___ tired, she finished the race.", options: ["being", "be", "is", "was"],   answer: "being" },
  { id: 47, type: "multiple_choice", prompt: "By 9 a.m. she ___ already left the office.", options: ["has", "had", "have", "was"], answer: "had" },
  { id: 48, type: "fill_the_gaps",   prompt: "He asked me where I ___ from.",   options: ["was", "were", "am", "be"],              answer: "was" },
  { id: 49, type: "multiple_choice", prompt: "You ___ smoke here — it's forbidden.", options: ["mustn't", "needn't", "don't have to", "shouldn't"], answer: "mustn't" },
  { id: 50, type: "sentence_builder", prompt: "Put the words in the correct order.",
    words: ["am", "getting", "to", "I", "up", "used", "early"], answer: "I am used to getting up early" },
  { id: 51, type: "multiple_choice", prompt: "He managed ___ the exam on his first attempt.", options: ["to pass", "passing", "pass", "passed"], answer: "to pass" },
  { id: 52, type: "fill_the_gaps",   prompt: "The book, ___ was published in 1985, is still popular.", options: ["which", "that", "who", "what"], answer: "which" },
  { id: 53, type: "multiple_choice", prompt: "Not only ___ late, but he also forgot his report.", options: ["was he", "he was", "he is", "is he"], answer: "was he" },
  { id: 54, type: "fill_the_gaps",   prompt: "She had her car ___ last Monday.", options: ["serviced", "service", "to service", "servicing"], answer: "serviced" },
  { id: 55, type: "multiple_choice", prompt: "You look tired. You ___ take a break.", options: ["ought to", "must", "shall", "will"], answer: "ought to" },
  { id: 56, type: "sentence_builder", prompt: "Put the words in the correct order.",
    words: ["stay", "at", "rather", "home", "I", "would"], answer: "I would rather stay at home" },
  { id: 57, type: "multiple_choice", prompt: "The bridge ___ next year, according to the plan.", options: ["will complete", "will be completed", "is completing", "completes"], answer: "will be completed" },
  { id: 58, type: "fill_the_gaps",   prompt: "He denied ___ the money.",        options: ["taking", "to take", "take", "taken"],   answer: "taking" },
  { id: 59, type: "multiple_choice", prompt: "There was no point ___ there.",   options: ["in going", "to go", "going", "go"],    answer: "in going" },
  { id: 60, type: "fill_the_gaps",   prompt: "She ___ the piano when I arrived.", options: ["was playing", "played", "has played", "is playing"], answer: "was playing" },

  // ── B2  qs 61–80  (index 60–79) ───────────────────────────────────
  { id: 61, type: "multiple_choice", prompt: "Had I known earlier, I ___ differently.", options: ["would behave", "would have behaved", "had behaved", "will behave"], answer: "would have behaved" },
  { id: 62, type: "fill_the_gaps",   prompt: "It is essential that he ___ on time.", options: ["is", "be", "was", "were"],         answer: "be" },
  { id: 63, type: "multiple_choice", prompt: "Choose the correct collocation: 'make ___'.", options: ["a mistake", "a travel", "sport", "an exercise"], answer: "a mistake" },
  { id: 64, type: "fill_the_gaps",   prompt: "The proposal was ___ by the board.", options: ["turned down", "turned up", "turned in", "turned over"], answer: "turned down" },
  { id: 65, type: "multiple_choice", prompt: "Seldom ___ such a performance.", options: ["I have seen", "have I seen", "I saw", "saw I"], answer: "have I seen" },
  { id: 66, type: "fill_the_gaps",   prompt: "She speaks French, ___ comes as a surprise.", options: ["which", "that", "who", "what"], answer: "which" },
  { id: 67, type: "multiple_choice", prompt: "The report needs ___ before submission.", options: ["proofreading", "to proofread", "proofreaded", "be proofread"], answer: "proofreading" },
  { id: 68, type: "sentence_builder", prompt: "Put the words in the correct order.",
    words: ["fed", "He", "noise", "the", "is", "with", "up"], answer: "He is fed up with the noise" },
  { id: 69, type: "multiple_choice", prompt: "I'd sooner you ___ that to him directly.", options: ["say", "said", "would say", "have said"], answer: "said" },
  { id: 70, type: "fill_the_gaps",   prompt: "___ be made clear that this policy is final.", options: ["It should", "There should", "This should", "One should"], answer: "It should" },
  { id: 71, type: "multiple_choice", prompt: "The word 'incessant' is closest in meaning to ___.", options: ["occasional", "constant", "brief", "sudden"], answer: "constant" },
  { id: 72, type: "fill_the_gaps",   prompt: "She came across ___ interesting article.", options: ["an", "a", "the", "\u2014"],    answer: "an" },
  { id: 73, type: "multiple_choice", prompt: "The students, ___ had studied abroad, performed best.", options: ["many of whom", "many of which", "many of them", "many who"], answer: "many of whom" },
  { id: 74, type: "fill_the_gaps",   prompt: "He ___ a fortune on that investment.", options: ["lost", "missed", "wasted", "spent"], answer: "lost" },
  { id: 75, type: "multiple_choice", prompt: "The contract was drawn ___ by our legal team.", options: ["up", "out", "in", "off"], answer: "up" },
  { id: 76, type: "sentence_builder", prompt: "Put the words in the correct order to form an advanced sentence.",
    words: ["left", "Not", "his", "she", "realise", "did", "until", "mistake", "he"], answer: "Not until she left did he realise his mistake" },
  { id: 77, type: "multiple_choice", prompt: "The phrase 'to beat around the bush' means ___.", options: ["to avoid the main topic", "to work outdoors", "to speak very loudly", "to decide quickly"], answer: "to avoid the main topic" },
  { id: 78, type: "fill_the_gaps",   prompt: "She was on the ___ of tears after the news.", options: ["verge", "edge", "brink", "point"], answer: "verge" },
  { id: 79, type: "multiple_choice", prompt: "Which sentence is grammatically correct?", options: ["She insisted that he should leave.", "She insisted that he leaves.", "She insisted that he left.", "She insisted that he is leaving."], answer: "She insisted that he should leave." },
  { id: 80, type: "fill_the_gaps",   prompt: "Despite ___ hard, they didn't win.", options: ["trying", "tried", "try", "to try"], answer: "trying" },

  // ── C1  qs 81–100  (index 80–99) ──────────────────────────────────
  { id: 81, type: "multiple_choice", prompt: "The subjunctive mood is used correctly in: ___.", options: ["I wish I was taller.", "I wish I were taller.", "I wish I am taller.", "I wish I will be taller."], answer: "I wish I were taller." },
  { id: 82, type: "fill_the_gaps",   prompt: "Her arguments were ___ — impossible to challenge.", options: ["irrefutable", "irresistible", "irreversible", "irregular"], answer: "irrefutable" },
  { id: 83, type: "multiple_choice", prompt: "Choose the sentence with a correct cleft structure.", options: ["It was John who broke the window.", "It was John that broke window.", "It is John who breaks the window last year.", "It was John which broke the window."], answer: "It was John who broke the window." },
  { id: 84, type: "fill_the_gaps",   prompt: "The new regulations will ___ effect from January.", options: ["take", "make", "do", "have"], answer: "take" },
  { id: 85, type: "multiple_choice", prompt: "'Eponymous' means ___.", options: ["giving one's name to something", "speaking in metaphors", "describing a tragedy", "using irony"], answer: "giving one's name to something" },
  { id: 86, type: "sentence_builder", prompt: "Put the words in the correct order.",
    words: ["fell", "The", "concerns", "through", "regulatory", "merger", "due", "to"], answer: "The merger fell through due to regulatory concerns" },
  { id: 87, type: "multiple_choice", prompt: "She spoke with great ___, choosing every word carefully.", options: ["circumspection", "circumference", "circumstance", "circulation"], answer: "circumspection" },
  { id: 88, type: "fill_the_gaps",   prompt: "The legislation was passed, ___ much controversy.", options: ["despite", "although", "however", "nevertheless"], answer: "despite" },
  { id: 89, type: "multiple_choice", prompt: "Select the correct inversion: 'Only after she left ___.'", options: ["did the meeting start", "the meeting started", "the meeting did start", "started the meeting"], answer: "did the meeting start" },
  { id: 90, type: "fill_the_gaps",   prompt: "He ___ no stone unturned in his search.",  options: ["left", "kept", "made", "turned"], answer: "left" },
  { id: 91, type: "multiple_choice", prompt: "The report was ___ with technical jargon.", options: ["replete", "replace", "redundant", "replenished"], answer: "replete" },
  { id: 92, type: "fill_the_gaps",   prompt: "Far ___ the truth, his account was entirely fabricated.", options: ["from", "off", "away", "beyond"], answer: "from" },
  { id: 93, type: "multiple_choice", prompt: "'Tendentious' writing is writing that ___.", options: ["promotes a particular viewpoint", "is technically precise", "is emotionally neutral", "uses complex metaphors"], answer: "promotes a particular viewpoint" },
  { id: 94, type: "sentence_builder", prompt: "Put the words in the correct order.",
    words: ["was", "new", "She", "as", "the", "appointed", "director"], answer: "She was appointed as the new director" },
  { id: 95, type: "multiple_choice", prompt: "Which is an example of a nominalization?", options: ["the investigation of the findings", "they investigated the findings", "to investigate findings", "investigating the findings quickly"], answer: "the investigation of the findings" },
  { id: 96, type: "fill_the_gaps",   prompt: "The ___ effect of the crisis was a collapse in consumer confidence.", options: ["cumulative", "accumulative", "culminative", "accelerative"], answer: "cumulative" },
  { id: 97, type: "multiple_choice", prompt: "In academic writing, 'notwithstanding' is used to mean ___.", options: ["despite / in spite of", "because of", "as a result of", "in addition to"], answer: "despite / in spite of" },
  { id: 98, type: "fill_the_gaps",   prompt: "The committee reached a ___ decision after hours of debate.", options: ["unanimous", "unique", "uniform", "universal"], answer: "unanimous" },
  { id: 99, type: "multiple_choice", prompt: "Which sentence uses a participle clause correctly?", options: ["Having submitted the report, she felt relieved.", "Submitted the report, she felt relieved.", "Having been submitted the report, she felt.", "After submitted the report she felt relieved."], answer: "Having submitted the report, she felt relieved." },
  { id: 100, type: "fill_the_gaps",  prompt: "The initiative was ___ as a direct response to the crisis.", options: ["conceived", "perceived", "deceived", "received"], answer: "conceived" },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
type CefrLevel = (typeof LEVELS)[number];

const LEVEL_RANGES: Record<CefrLevel, [number, number]> = {
  A1: [0, 19], A2: [20, 39], B1: [40, 59], B2: [60, 79], C1: [80, 99],
};

const LEVEL_DESCRIPTIONS: Record<CefrLevel, string> = {
  A1: "Beginner — Can use very basic expressions and introduce themselves.",
  A2: "Elementary — Can communicate in simple, routine tasks.",
  B1: "Intermediate — Can deal with most everyday situations while travelling.",
  B2: "Upper-intermediate — Can interact with a degree of fluency and spontaneity.",
  C1: "Advanced — Can express ideas fluently and use language flexibly.",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** 70 % threshold (≥14/20) per block; sequential — breaks on first failure. */
function computeLevel(results: boolean[]): CefrLevel | null {
  const passed: CefrLevel[] = [];
  for (const lvl of LEVELS) {
    const [from, to] = LEVEL_RANGES[lvl];
    const slice = results.slice(from, to + 1);
    if (slice.length < 20) break;
    if (slice.filter(Boolean).length >= 14) passed.push(lvl);
    else break;
  }
  return passed.length ? passed[passed.length - 1] : null;
}

export function getPlacementState(results: boolean[]) {
  const level = computeLevel(results);
  if (!level) {
    return {
      level: null,
      belowA1: true,
      message: "See you next time",
    };
  }

  return {
    level,
    belowA1: false,
    message: LEVEL_DESCRIPTIONS[level],
  };
}

function computeBreakdown(results: boolean[]) {
  return (Object.keys(LEVEL_RANGES) as CefrLevel[]).map((level) => {
    const [from, to] = LEVEL_RANGES[level];
    const slice = results.slice(from, to + 1);
    const attempted = slice.length > 0;
    const correct = slice.filter(Boolean).length;
    return {
      level, correct, total: slice.length,
      pct: attempted ? Math.round((correct / slice.length) * 100) : 0,
      attempted,
    };
  });
}

function getBlockModal(
  results: boolean[],
  blockIdx: number,
): { modal: ModalContent; afterModal: "continue" | "result" } {
  const level = LEVELS[blockIdx];
  const blockSlice = results.slice(blockIdx * 20, blockIdx * 20 + 20);
  const passed = blockSlice.filter(Boolean).length >= 14;
  const isLast = blockIdx === 4;

  if (!passed) {
    const modal: ModalContent =
      blockIdx === 0
        ? { emoji: "📚", title: "Keep practising!", message: "You need to brush up on your basics. Let's start with A1 learning!", cta: "See my results" }
        : { emoji: "⭐", title: "Well done!", message: `Great job! You are a superstar and you officially receive ${LEVELS[blockIdx - 1]} level. Let's work on reaching ${level}!`, cta: "See my results" };
    return { modal, afterModal: "result" };
  }

  const modal: ModalContent = isLast
    ? { emoji: "🏆", title: "Outstanding!", message: `You are a superstar and you officially receive ${level} level. Exceptional achievement!`, cta: "See my results" }
    : { emoji: "🎉", title: `${level} complete!`, message: `You are a superstar and you officially receive ${level} level. Let's see how you do at ${LEVELS[blockIdx + 1]}!`, cta: `Continue to ${LEVELS[blockIdx + 1]} \u2192` };

  return { modal, afterModal: isLast ? "result" : "continue" };
}

function isBuilderCorrect(q: Question, order: number[]) {
  return order.map((i) => q.words![i]).join(" ") === q.answer;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function init(): State {
  return { phase: "intro", current: 0, selected: -1, builderOrder: [], feedback: false, results: [], modal: null, afterModal: null };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      return { ...init(), phase: "test" };

    case "SELECT":
      if (state.feedback) return state;
      return { ...state, selected: action.index, feedback: true };

    case "BUILDER_TOGGLE": {
      if (state.feedback) return state;
      const idx = state.builderOrder.indexOf(action.slotIdx);
      const next = idx !== -1
        ? state.builderOrder.filter((_, i) => i !== idx)
        : [...state.builderOrder, action.slotIdx];
      return { ...state, builderOrder: next };
    }

    case "BUILDER_CLEAR":
      if (state.feedback) return state;
      return { ...state, builderOrder: [] };

    case "CHECK_BUILDER":
      if (state.feedback || state.builderOrder.length === 0) return state;
      return { ...state, feedback: true };

    case "NEXT": {
      const q = QUESTIONS[state.current];
      const correct = q.type === "sentence_builder"
        ? isBuilderCorrect(q, state.builderOrder)
        : state.selected !== -1 && q.options![state.selected] === q.answer;

      const newResults = [...state.results, correct];
      const isBlockEnd = (state.current + 1) % 20 === 0;

      if (isBlockEnd) {
        const { modal, afterModal } = getBlockModal(newResults, Math.floor(state.current / 20));
        return { ...state, results: newResults, selected: -1, builderOrder: [], feedback: false, modal, afterModal };
      }

      return { ...state, results: newResults, current: state.current + 1, selected: -1, builderOrder: [], feedback: false };
    }

    case "FINISH": {
      const q = QUESTIONS[state.current];
      let finalResults = [...state.results];
      if (state.feedback) {
        const correct = q.type === "sentence_builder"
          ? isBuilderCorrect(q, state.builderOrder)
          : state.selected !== -1 && q.options![state.selected] === q.answer;
        finalResults = [...finalResults, correct];
      }
      return { ...state, results: finalResults, phase: "result", modal: null, afterModal: null };
    }

    case "DISMISS_MODAL":
      if (!state.modal) return state;
      if (state.afterModal === "result") return { ...state, modal: null, afterModal: null, phase: "result" };
      return { ...state, modal: null, afterModal: null, current: state.current + 1 };

    case "RESTART":
      return init();

    default:
      return state;
  }
}

// ─── SentenceBuilderInput ─────────────────────────────────────────────────────

function SentenceBuilderInput({ q, builderOrder, feedback, onToggle, onClear }: {
  q: Question;
  builderOrder: number[];
  feedback: boolean;
  onToggle: (slotIdx: number) => void;
  onClear: () => void;
}) {
  const words = q.words!;
  const usedSet = new Set(builderOrder);
  const correct = feedback && isBuilderCorrect(q, builderOrder);
  const wrong   = feedback && !isBuilderCorrect(q, builderOrder);

  const chipCls = correct
    ? `${s.ptChip} ${s.ptChipCorrect}`
    : wrong
    ? `${s.ptChip} ${s.ptChipWrong}`
    : `${s.ptChip} ${s.ptChipPlaced}`;

  return (
    <div className={s.ptBuilderArea}>
      <div className={`${s.ptBuilderSentence} ${builderOrder.length > 0 ? s.ptBuilderSentenceActive : ""}`}>
        {builderOrder.length === 0
          ? <span className={s.ptBuilderPlaceholder}>Tap words below to build the sentence\u2026</span>
          : builderOrder.map((slotIdx, pos) => (
            <button key={pos} type="button" className={chipCls}
              onClick={() => !feedback && onToggle(slotIdx)} disabled={feedback}
              title={feedback ? undefined : "Tap to remove"}>
              {words[slotIdx]}
            </button>
          ))
        }
      </div>

      {!feedback && builderOrder.length > 0 && (
        <button type="button" className={s.ptBuilderClear} onClick={onClear}>
          \u2715 Clear all
        </button>
      )}

      <div className={s.ptBuilderBank}>
        {words.map((word, idx) =>
          usedSet.has(idx) ? null : (
            <button key={idx} type="button" className={`${s.ptChip} ${s.ptChipBank}`}
              onClick={() => onToggle(idx)} disabled={feedback}>
              {word}
            </button>
          )
        )}
      </div>

      {wrong && (
        <p className={s.ptBuilderAnswer}>\u2713 Correct: <strong>{q.answer}</strong></p>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlacementTest() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const { phase, current, selected, builderOrder, feedback, results, modal } = state;

  const q = QUESTIONS[current];
  const progress = phase === "result" ? 100 : Math.round((current / QUESTIONS.length) * 100);

  const activeLevel = useMemo(
    () => (Object.keys(LEVEL_RANGES) as CefrLevel[]).find(
      (l) => current >= LEVEL_RANGES[l][0] && current <= LEVEL_RANGES[l][1],
    ) ?? "A1",
    [current],
  );

  const correctIndex = useMemo(
    () => (q?.options ? q.options.findIndex((o) => o === q.answer) : -1),
    [q],
  );

  const handleSelect  = useCallback((i: number) => dispatch({ type: "SELECT", index: i }), []);
  const handleNext    = useCallback(() => dispatch({ type: "NEXT" }), []);
  const handleFinish  = useCallback(() => dispatch({ type: "FINISH" }), []);
  const handleToggle  = useCallback((idx: number) => dispatch({ type: "BUILDER_TOGGLE", slotIdx: idx }), []);
  const handleClear   = useCallback(() => dispatch({ type: "BUILDER_CLEAR" }), []);
  const handleCheck   = useCallback(() => dispatch({ type: "CHECK_BUILDER" }), []);
  const handleDismiss = useCallback(() => dispatch({ type: "DISMISS_MODAL" }), []);

  // ── Intro ────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className={s.ptWrap}>
        <div className={s.ptCard}>
          <div className={s.ptIntro}>
            <span className={s.ptIntroIcon}>🎯</span>
            <h2 className={s.ptIntroTitle}>English Level Placement Test</h2>
            <p className={s.ptIntroDesc}>
              Discover your CEFR level in minutes. Answer 100 questions ranging from A1 to C1
              and get a detailed breakdown of your strengths and areas to improve.
            </p>
            <div className={s.ptIntroMeta}>
              <span className={s.ptIntroChip}>📝 100 questions</span>
              <span className={s.ptIntroChip}>🏆 A1 \u2192 C1</span>
              <span className={s.ptIntroChip}>⏱ ~15 min</span>
            </div>
            <button type="button" className={`${s.ptBtn} ${s.ptBtnPrimary}`}
              onClick={() => dispatch({ type: "START" })}>
              Start the test
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Result ───────────────────────────────────────────────────────────
  if (phase === "result") {
    const placement = getPlacementState(results);
    const level = placement.level;
    const breakdown = computeBreakdown(results).filter((b) => b.attempted);
    const strengths  = breakdown.filter((b) => b.pct >= 70).map((b) => b.level);
    const weaknesses = breakdown.filter((b) => b.pct < 70).map((b) => b.level);
    const totalCorrect = results.filter(Boolean).length;

    return (
      <div className={s.ptWrap}>
        <div className={s.ptCard}>
          <div className={s.ptProgressTrack}><div className={s.ptProgressFill} style={{ width: "100%" }} /></div>
          <div className={s.ptResult}>
            <div className={s.ptResultHeader}>
              {level ? (
                <>
                  <div className={s.ptResultLevel}>{level}</div>
                  <h2 className={s.ptResultTitle}>Your level: {level}</h2>
                  <p className={s.ptResultSub}>{LEVEL_DESCRIPTIONS[level]}</p>
                </>
              ) : (
                <>
                  <div className={s.ptResultLevel} style={{ background: "#fef2f2", color: "#b91c1c" }}>—</div>
                  <h2 className={s.ptResultTitle}>See you next time</h2>
                  <p className={s.ptResultSub}>You did not reach the A1 threshold yet. Keep practising and come back when you are ready.</p>
                </>
              )}
              <p className={s.ptResultSub} style={{ marginTop: 6 }}>
                <strong style={{ color: "#1e293b" }}>{totalCorrect} / {results.length}</strong> correct answers
              </p>
            </div>

            {level && (
              <>
                <div className={s.ptScoreGrid}>
                  {breakdown.map(({ level: lvl, correct, total, pct }) => (
                    <div key={lvl} className={s.ptScoreRow}>
                      <span className={s.ptScoreLabel}>{lvl}</span>
                      <div className={s.ptScoreTrack}>
                        <div className={`${s.ptScoreBar} ${pct < 70 ? s.ptScoreBarWeak : ""}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={s.ptScoreNum}>{correct}/{total}</span>
                    </div>
                  ))}
                </div>

                {(strengths.length > 0 || weaknesses.length > 0) && (
                  <div className={s.ptTags}>
                    {strengths.map((l) => <span key={l} className={`${s.ptTag} ${s.ptTagStrong}`}>✓0 Strong at {l}</span>)}
                    {weaknesses.map((l) => <span key={l} className={`${s.ptTag} ${s.ptTagWeak}`}>✓1 Review {l}</span>)}
                  </div>
                )}
              </>
            )}

            <div className={s.ptCta}>
              {level ? (
                <Link href={`/levels/${level.toLowerCase()}`} className={`${s.ptCtaBtn} ${s.ptCtaBtnPrimary}`}>
                  🚀 Explore {level} courses
                </Link>
              ) : (
                <button type="button" className={`${s.ptCtaBtn} ${s.ptCtaBtnPrimary}`} onClick={() => dispatch({ type: "RESTART" })}>
                  🔁 Try again
                </button>
              )}
              <button type="button" className={`${s.ptCtaBtn} ${s.ptCtaBtnSecondary}`}
                onClick={() => dispatch({ type: "RESTART" })}>
                \u21ba Retake the test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Test ─────────────────────────────────────────────────────────────
  const isLast   = current === QUESTIONS.length - 1;
  const canCheck = q.type === "sentence_builder" && !feedback && builderOrder.length > 0;

  return (
    <div className={s.ptWrap}>
      <div className={s.ptCard}>
        {/* Progress */}
        <div className={s.ptProgressTrack}><div className={s.ptProgressFill} style={{ width: `${progress}%` }} /></div>

        {/* Level strip */}
        <div className={s.ptLevelStrip}>
          {LEVELS.map((l) => (
            <div key={l} className={`${s.ptLevelPip} ${
              l === activeLevel ? s.ptLevelPipActive
              : LEVELS.indexOf(l) < LEVELS.indexOf(activeLevel) ? s.ptLevelPipDone
              : ""
            }`} />
          ))}
        </div>

        {/* Header */}
        <div className={s.ptHeader}>
          <div className={s.ptBadge}><span className={s.ptBadgeDot} />{activeLevel}</div>
          <span className={s.ptCounter}><span className={s.ptCounterBold}>{current + 1}</span> / {QUESTIONS.length}</span>
        </div>

        {/* Body */}
        <div className={s.ptBody}>
          <p className={s.ptLevelLabel}>{activeLevel} \u00b7 Question {current + 1}</p>

          <div className={s.ptQuestion} key={current}>
            {/* Prompt with animated gap for fill_the_gaps */}
            <p className={s.ptQuestionText}>
              {q.type === "fill_the_gaps"
                ? q.prompt.split("___").map((part, i, arr) =>
                    i < arr.length - 1 ? (
                      <span key={i}>
                        {part}
                        <span className={`${s.ptGap} ${
                          feedback && selected !== -1
                            ? (q.options![selected] === q.answer ? s.ptGapCorrect : s.ptGapWrong)
                            : ""
                        }`}>
                          {feedback && selected !== -1 ? q.options![selected] : "___"}
                        </span>
                      </span>
                    ) : part
                  )
                : q.prompt
              }
            </p>

            {/* Sentence builder OR option list */}
            {q.type === "sentence_builder" ? (
              <SentenceBuilderInput q={q} builderOrder={builderOrder} feedback={feedback}
                onToggle={handleToggle} onClear={handleClear} />
            ) : (
              <div className={s.ptOptions} role="listbox" aria-label="Answer options">
                {q.options!.map((opt, i) => {
                  let cls = s.ptOption;
                  if (feedback) {
                    if (i === correctIndex) cls = `${s.ptOption} ${s.ptOptionCorrect}`;
                    else if (i === selected) cls = `${s.ptOption} ${s.ptOptionWrong}`;
                  } else if (i === selected) {
                    cls = `${s.ptOption} ${s.ptOptionSelected}`;
                  }
                  return (
                    <button key={i} type="button" role="option" aria-selected={i === selected}
                      className={cls} onClick={() => handleSelect(i)} disabled={feedback}>
                      <span className={s.ptOptionMarker}>{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Inline feedback toast shown after answering */}
            {feedback && q.type !== "sentence_builder" && (
              selected === correctIndex ? (
                <div className={s.ptFeedbackCorrect} role="status">
                  <span className={s.ptFeedbackIcon}>🎉</span>
                  <span>
                    <strong>Well done!</strong> That’s the right answer.
                  </span>
                </div>
              ) : (
                <div className={s.ptFeedbackWrong} role="status">
                  <span className={s.ptFeedbackIcon}>❌</span>
                  <span>
                    Correct answer: <strong>{q.answer}</strong>
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={s.ptFooter}>
          <button type="button" className={`${s.ptBtn} ${s.ptBtnDanger}`} style={{ marginRight: "auto" }} onClick={handleFinish}>
            Finish test
          </button>
          {q.type === "sentence_builder" && !feedback ? (
            <button type="button" className={`${s.ptBtn} ${s.ptBtnPrimary}`} onClick={handleCheck} disabled={!canCheck}>
              Check \u2192
            </button>
          ) : (
            <button type="button" className={`${s.ptBtn} ${s.ptBtnPrimary}`} onClick={handleNext} disabled={!feedback}>
              {isLast ? "See my results \u2192" : "Next \u2192"}
            </button>
          )}
        </div>

        {/* Level transition modal */}
        {modal && (
          <div className={s.ptModal} role="dialog" aria-modal="true" aria-label={modal.title}>
            <div className={s.ptModalCard}>
              <span className={s.ptModalEmoji}>{modal.emoji}</span>
              <h3 className={s.ptModalTitle}>{modal.title}</h3>
              <p className={s.ptModalMsg}>{modal.message}</p>
              <button type="button" className={s.ptModalCta} onClick={handleDismiss}>{modal.cta}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
