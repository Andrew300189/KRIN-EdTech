/** One concise five-card block per phrase: say, recognize, write, use in a
 * sentence, then translate back. The final review has one card per phrase. */
export const BAG_CARD_ORDER = ["P", "CE", "TL", "S", "TE"] as const;
export const BAG_STORY_PLAN_VERSION = 3;
export const BAG_STAGES_PER_BLOCK = BAG_CARD_ORDER.length;
export const BAG_LEGACY_PRACTICE_ROUNDS = 76;
export const BAG_LEGACY_REVIEW_ROUNDS = 5;
const LEGACY_BAG_CARD_ORDER = (
  "P CE TL TE S CL TE P TL S TL P TE CE TE CL TL P S P TL CE TE S CL P TE TL TE CE P TL S TE TL P CL P TE TL CE S CL TL P TE TL CE TE P S TE P CL TL P CE TE TL S CL TE TL P TL P CE TE S TE TL CL P CE P TE TL S"
).split(" ") as Array<"P" | "CE" | "CL" | "TE" | "TL" | "S">;

export type BagStageKind = "BAG_PHRASE" | "BAG_CHUNK" | "BAG_SENTENCE_ASSEMBLE" | "BAG_SENTENCE" | "BAG_RECALL" | "BAG_REVIEW";
export type BagChunkCode = "INTRO" | "MEANING" | "HEAR" | "ASSEMBLE" | "VISIBLE" | "RECALL_1" | "TYPE" | "RECALL_2" | "RECALL_3";
export const BAG_CHUNK_ORDER: BagChunkCode[] = ["INTRO", "MEANING", "HEAR", "ASSEMBLE", "VISIBLE", "RECALL_1", "TYPE", "RECALL_2", "RECALL_3"];
export const BAG_CHUNK_STAGE_SPAN = BAG_CHUNK_ORDER.length * 2;
export const bagChunkKey = (english: string) => english.toLocaleLowerCase("en").trim();
export function bagQuickCheckEligible(stage: BagStage, chunkEnglish: string | null, masteredChunks: string[], relearningChunks: string[]) {
  return Boolean(chunkEnglish && stage.kind === "BAG_CHUNK" && stage.chunkCode === "INTRO" && masteredChunks.includes(bagChunkKey(chunkEnglish)) && !relearningChunks.includes(stage.key));
}
export const BAG_STORY_CHUNK_COUNTS = [1, 3, 1, 1, 1, 2, 2, 1, 1, 2] as const;
export function isBagStorySettings(value: unknown): value is Record<string, unknown> & { engine: "bag-story" } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).engine === "bag-story");
}
export type BagStage = {
  key: string;
  kind: BagStageKind;
  wordId: string;
  wordOrdinal: number;
  cardNumber: number;
  code: (typeof BAG_CARD_ORDER)[number] | "CL" | "CHUNK" | "SENTENCE" | "RECALL";
  storyIndex: number | null;
  requiredSteps: number;
  choiceWordIds: string[];
  chunkIndex?: number;
  chunkCode?: BagChunkCode;
  sentenceMode?: "VISIBLE" | "HIDDEN";
};

export function buildBagStoryStages(wordIds: string[], phraseLemmas?: string[], planVersion = BAG_STORY_PLAN_VERSION): BagStage[] {
  if (planVersion < BAG_STORY_PLAN_VERSION) return buildLegacyBagStoryStages(wordIds, phraseLemmas);
  void phraseLemmas;
  return wordIds.flatMap((wordId, wordOrdinal) =>
    BAG_CARD_ORDER.map((code, index): BagStage => {
      const base = { wordId, wordOrdinal, cardNumber: index + 1, choiceWordIds: wordIds };
      const key = `bag-${wordOrdinal + 1}-${String(index + 1).padStart(2, "0")}`;
      return code === "S"
        ? { ...base, key, kind: "BAG_SENTENCE_ASSEMBLE", code: "SENTENCE", storyIndex: 1, requiredSteps: 1 }
        : { ...base, key, kind: "BAG_PHRASE", code, storyIndex: null, requiredSteps: 1 };
    }),
  );
}

export function bagStoryStageCount(wordCount: number, planVersion = BAG_STORY_PLAN_VERSION) {
  if (planVersion < BAG_STORY_PLAN_VERSION) return Math.max(0, Math.trunc(wordCount)) * 377;
  return Math.max(0, Math.trunc(wordCount)) * BAG_STAGES_PER_BLOCK;
}

/** One mixed check per phrase, displayed in six five-card blocks. */
export function buildBagReviewStages(wordIds: string[], planVersion = BAG_STORY_PLAN_VERSION): BagStage[] {
  if (planVersion < BAG_STORY_PLAN_VERSION) return wordIds.flatMap((wordId, wordOrdinal) => (["TL", "TE", "P", "RECALL"] as const).map((code, index): BagStage => ({
    key: `bag-review-${wordOrdinal + 1}-${index + 1}`,
    kind: "BAG_REVIEW", wordId, wordOrdinal, cardNumber: index + 1, code,
    storyIndex: code === "RECALL" ? 2 : null,
    requiredSteps: code === "RECALL" ? 2 : 1,
    choiceWordIds: wordIds,
  })));
  const reviewOrder = ["CE", "TL", "TE", "P", "TL"] as const;
  return wordIds.map((wordId, wordOrdinal): BagStage => ({
    key: `bag-review-${wordOrdinal + 1}`,
    kind: "BAG_REVIEW",
    wordId, wordOrdinal, cardNumber: 1, code: reviewOrder[wordOrdinal % reviewOrder.length]!,
    storyIndex: null,
    requiredSteps: 1,
    choiceWordIds: wordIds,
  }));
}

/** Distributes every old card into short lessons: five phrases alternate, with
 * up to five legacy cards per phrase. No historic stage is dropped or doubled. */
export function buildBagLegacyPracticeStages(wordIds: string[], phraseLemmas: string[], round: number, reviewAll = false): BagStage[] {
  if (!Number.isInteger(round) || round < 0 || round >= (reviewAll ? BAG_LEGACY_REVIEW_ROUNDS : BAG_LEGACY_PRACTICE_ROUNDS)) return [];
  if (reviewAll) return buildBagReviewStages(wordIds, 2).slice(round * 25, (round + 1) * 25);
  const stages = buildBagStoryStages(wordIds, phraseLemmas, 2);
  const perWord = bagStoryStageCount(1, 2);
  return wordIds.flatMap((_, wordOrdinal) => stages.slice(wordOrdinal * perWord + round * BAG_STAGES_PER_BLOCK, Math.min((wordOrdinal + 1) * perWord, wordOrdinal * perWord + (round + 1) * BAG_STAGES_PER_BLOCK)));
}

/** Old sessions stay readable until the published course is upgraded. */
function buildLegacyBagStoryStages(wordIds: string[], phraseLemmas?: string[]): BagStage[] {
  return wordIds.flatMap((wordId, wordOrdinal) => {
    let storyIndex = 0;
    const chunkCounts = phraseLemmas?.[wordOrdinal]
      ? bagStory(phraseLemmas[wordOrdinal]!, "", "uk").map((line) => line.chunks.length)
      : BAG_STORY_CHUNK_COUNTS;
    return LEGACY_BAG_CARD_ORDER.flatMap((code, index): BagStage[] => {
      const base = { wordId, wordOrdinal, cardNumber: index + 1, choiceWordIds: wordIds };
      const key = `bag-${wordOrdinal + 1}-${String(index + 1).padStart(2, "0")}`;
      if (code !== "S") return [{ ...base, key, kind: "BAG_PHRASE", code, storyIndex: null, requiredSteps: 1 }];
      storyIndex += 1;
      const storyStages: BagStage[] = [];
      for (let chunkIndex = 0; chunkIndex < chunkCounts[storyIndex - 1]!; chunkIndex += 1) {
        for (const [drillIndex, chunkCode] of BAG_CHUNK_ORDER.entries()) {
          storyStages.push({ ...base, key: `${key}-chunk-${chunkIndex}-${drillIndex}`, kind: "BAG_CHUNK", code: "CHUNK", storyIndex, chunkIndex, chunkCode, requiredSteps: 1 });
          storyStages.push({ ...base, key: `${key}-interleave-${chunkIndex}-${drillIndex}`, kind: "BAG_PHRASE", code: (["CE", "TL", "P", "TE"] as const)[drillIndex % 4]!, storyIndex: null, requiredSteps: 1 });
        }
      }
      storyStages.push({ ...base, key: `${key}-sentence-assemble`, kind: "BAG_SENTENCE_ASSEMBLE", code: "SENTENCE", storyIndex, requiredSteps: 1 });
      storyStages.push({ ...base, key: `${key}-sentence-visible`, kind: "BAG_SENTENCE", code: "SENTENCE", storyIndex, sentenceMode: "VISIBLE", requiredSteps: 1 });
      storyStages.push({ ...base, key: `${key}-sentence-hidden`, kind: "BAG_SENTENCE", code: "SENTENCE", storyIndex, sentenceMode: "HIDDEN", requiredSteps: 1 });
      if (storyIndex >= 2) storyStages.push({ ...base, key: `${key}-recall`, kind: "BAG_RECALL", code: "RECALL", storyIndex, requiredSteps: storyIndex });
      return storyStages;
    });
  });
}

export type BagStoryLine = { english: string; local: string; chunks: Array<{ english: string; local: string }> };

/** These short scenes deliberately use only the phrase and elementary verbs.
 * The last action changes by food type so an unsuitable item is never cooked. */
export function bagStory(phrase: string, translation: string, locale: "uk" | "ru"): BagStoryLine[] {
  const uk = locale === "uk";
  const chunk = (english: string, ukrainian: string, russian: string) => ({ english, local: uk ? ukrainian : russian });
  const line = (english: string, ukrainian: string, russian: string, chunks: ReturnType<typeof chunk>[]): BagStoryLine => ({ english, local: uk ? ukrainian : russian, chunks });
  if (phrase === "a bag of apples" || phrase === "a bag of oranges") {
    const apples = phrase === "a bag of apples";
    const family = apples ? "My sister" : "Dad";
    const familyUk = apples ? "Моя сестра" : "Тато";
    const familyRu = apples ? "Моя сестра" : "Папа";
    return [
      line(`I want ${phrase}.`, `Я хочу ${translation}.`, `Я хочу ${translation}.`, [chunk("I want", "Я хочу", "Я хочу")]),
      line(`I see ${phrase} in the shop.`, `Я бачу ${translation} у магазині.`, `Я вижу ${translation} в магазине.`, [chunk("I see", "Я бачу", "Я вижу"), chunk("in", "у", "в"), chunk("the shop", "магазині", "магазине")]),
      line(`I take ${phrase}.`, `Я беру ${translation}.`, `Я беру ${translation}.`, [chunk("I take", "Я беру", "Я беру")]),
      line(`I pay for ${phrase}.`, `Я плачу за ${translation}.`, `Я плачу за ${translation}.`, [chunk("I pay for", "Я плачу за", "Я плачу за")]),
      line(`I bring ${phrase} home.`, `Я приношу ${translation} додому.`, `Я приношу ${translation} домой.`, [chunk("I bring", "Я приношу", "Я приношу"), chunk("home", "додому", "домой")]),
      line(`I put ${phrase} on the table.`, `Я кладу ${translation} на стіл.`, `Я кладу ${translation} на стол.`, [chunk("I put", "Я кладу", "Я кладу"), chunk("on the table", "на стіл", "на стол")]),
      line(`${family} sees ${phrase}.`, `${familyUk} бачить ${translation}.`, `${familyRu} видит ${translation}.`, [chunk(`${family} sees`, `${familyUk} бачить`, `${familyRu} видит`)]),
      line(`${family} opens ${phrase}.`, `${familyUk} відкриває ${translation}.`, `${familyRu} открывает ${translation}.`, [chunk(`${family} opens`, `${familyUk} відкриває`, `${familyRu} открывает`)]),
      line(`We share ${phrase}.`, apples ? "Ми ділимося пакетом яблук." : "Ми ділимося пакетом апельсинів.", apples ? "Мы делимся пакетом яблок." : "Мы делимся пакетом апельсинов.", [chunk("We share", "Ми ділимося", "Мы делимся")]),
      line(`I take ${phrase} to school.`, `Я беру ${translation} до школи.`, `Я беру ${translation} в школу.`, [chunk("I take", "Я беру", "Я беру"), chunk("to school", "до школи", "в школу")]),
    ];
  }
  if (phrase === "a bag of carrots") {
    return [
      line(`I need ${phrase}.`, `Мені потрібен ${translation}.`, `Мне нужен ${translation}.`, [chunk("I need", "Мені потрібен", "Мне нужен")]),
      line(`I see ${phrase} in the shop.`, `Я бачу ${translation} у магазині.`, `Я вижу ${translation} в магазине.`, [chunk("I see", "Я бачу", "Я вижу"), chunk("in", "у", "в"), chunk("the shop", "магазині", "магазине")]),
      line(`I take ${phrase}.`, `Я беру ${translation}.`, `Я беру ${translation}.`, [chunk("I take", "Я беру", "Я беру")]),
      line(`I pay for ${phrase}.`, `Я плачу за ${translation}.`, `Я плачу за ${translation}.`, [chunk("I pay for", "Я плачу за", "Я плачу за")]),
      line(`I bring ${phrase} home.`, `Я приношу ${translation} додому.`, `Я приношу ${translation} домой.`, [chunk("I bring", "Я приношу", "Я приношу")]),
      line(`I put ${phrase} on the table.`, `Я кладу ${translation} на стіл.`, `Я кладу ${translation} на стол.`, [chunk("I put", "Я кладу", "Я кладу"), chunk("on the table", "на стіл", "на стол")]),
      line(`Mum sees ${phrase}.`, `Мама бачить ${translation}.`, `Мама видит ${translation}.`, [chunk("Mum sees", "Мама бачить", "Мама видит")]),
      line(`Mum opens ${phrase}.`, `Мама відкриває ${translation}.`, `Мама открывает ${translation}.`, [chunk("Mum opens", "Мама відкриває", "Мама открывает")]),
      line(`I wash the carrots from ${phrase}.`, "Я мию моркву з пакета.", "Я мою морковь из пакета.", [chunk("I wash", "Я мию", "Я мою"), chunk("from", "з", "из")]),
      line(`We use ${phrase} for soup.`, `Ми використовуємо ${translation} для супу.`, `Мы используем ${translation} для супа.`, [chunk("We use", "Ми використовуємо", "Мы используем"), chunk("for soup", "для супу", "для супа")]),
    ];
  }
  const endings: Record<string, { verb: string; verbUk: string; verbRu: string; purpose: string; purposeUk: string; purposeRu: string }> = {
    sweets: { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "to the party", purposeUk: "на свято", purposeRu: "на праздник" },
    popcorn: { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "to the cinema", purposeUk: "до кіно", purposeRu: "в кино" },
    "coffee beans": { verb: "Dad uses", verbUk: "Тато використовує", verbRu: "Папа использует", purpose: "to make coffee", purposeUk: "щоб приготувати каву", purposeRu: "чтобы приготовить кофе" },
    "frozen vegetables": { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for soup", purposeUk: "для супу", purposeRu: "для супа" },
    potatoes: { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for dinner", purposeUk: "для вечері", purposeRu: "для ужина" },
    pears: { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "for a picnic", purposeUk: "на пікнік", purposeRu: "на пикник" },
    grapes: { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "to our friends", purposeUk: "до друзів", purposeRu: "к друзьям" },
    lemons: { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for lemonade", purposeUk: "для лимонаду", purposeRu: "для лимонада" },
    nuts: { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "after school", purposeUk: "після школи", purposeRu: "после школы" },
    almonds: { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for a cake", purposeUk: "для пирога", purposeRu: "для пирога" },
    peanuts: { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "to the park", purposeUk: "до парку", purposeRu: "в парк" },
    "dried fruit": { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "on a trip", purposeUk: "у подорож", purposeRu: "в поездку" },
    raisins: { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for buns", purposeUk: "для булочок", purposeRu: "для булочек" },
    pasta: { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for lunch", purposeUk: "для обіду", purposeRu: "для обеда" },
    lentils: { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for soup", purposeUk: "для супу", purposeRu: "для супа" },
    oats: { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for breakfast", purposeUk: "для сніданку", purposeRu: "для завтрака" },
    cereal: { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "for breakfast", purposeUk: "на сніданок", purposeRu: "на завтрак" },
    spinach: { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for a salad", purposeUk: "для салату", purposeRu: "для салата" },
    lettuce: { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for a salad", purposeUk: "для салату", purposeRu: "для салата" },
    "frozen berries": { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for a smoothie", purposeUk: "для смузі", purposeRu: "для смузи" },
    "frozen peas": { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for soup", purposeUk: "для супу", purposeRu: "для супа" },
    "frozen chips": { verb: "We use", verbUk: "Ми використовуємо", verbRu: "Мы используем", purpose: "for dinner", purposeUk: "для вечері", purposeRu: "для ужина" },
    "bread rolls": { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "for lunch", purposeUk: "на обід", purposeRu: "на обед" },
    bagels: { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "for breakfast", purposeUk: "на сніданок", purposeRu: "на завтрак" },
    marshmallows: { verb: "We take", verbUk: "Ми беремо", verbRu: "Мы берём", purpose: "to the campfire", purposeUk: "до багаття", purposeRu: "к костру" },
  };
  const ending = endings[phrase.replace(/^a bag of /, "")];
  const last = phrase === "a bag of flour"
    ? line(`We use ${phrase} for a cake.`, `Ми використовуємо ${translation} для пирога.`, `Мы используем ${translation} для пирога.`, [chunk("We use", "Ми використовуємо", "Мы используем"), chunk("for a cake", "для пирога", "для пирога")])
    : ending
      ? line(`${ending.verb} ${phrase} ${ending.purpose}.`, `${ending.verbUk} ${translation} ${ending.purposeUk}.`, `${ending.verbRu} ${translation} ${ending.purposeRu}.`, [chunk(ending.verb, ending.verbUk, ending.verbRu), chunk(ending.purpose, ending.purposeUk, ending.purposeRu)])
      : line(`We use ${phrase} for dinner.`, `Ми використовуємо ${translation} для вечері.`, `Мы используем ${translation} для ужина.`, [chunk("We use", "Ми використовуємо", "Мы используем"), chunk("for dinner", "для вечері", "для ужина")]);
  return [
    line(`I need ${phrase}.`, `Мені потрібен ${translation}.`, `Мне нужен ${translation}.`, [chunk("I need", "Мені потрібен", "Мне нужен")]),
    line(`I go to the shop for ${phrase}.`, `Я йду до магазину по ${translation}.`, `Я иду в магазин за ${translation}.`, [chunk("I go", "Я йду", "Я иду"), chunk("to the shop", "до магазину", "в магазин"), chunk("for", "по", "за")]),
    line(`I see ${phrase}.`, `Я бачу ${translation}.`, `Я вижу ${translation}.`, [chunk("I see", "Я бачу", "Я вижу")]),
    line(`I take ${phrase}.`, `Я беру ${translation}.`, `Я беру ${translation}.`, [chunk("I take", "Я беру", "Я беру")]),
    line(`I pay for ${phrase}.`, `Я плачу за ${translation}.`, `Я плачу за ${translation}.`, [chunk("I pay for", "Я плачу за", "Я плачу за")]),
    line(`I bring ${phrase} home.`, `Я приношу ${translation} додому.`, `Я приношу ${translation} домой.`, [chunk("I bring", "Я приношу", "Я приношу"), chunk("home", "додому", "домой")]),
    line(`I put ${phrase} on the table.`, `Я кладу ${translation} на стіл.`, `Я кладу ${translation} на стол.`, [chunk("I put", "Я кладу", "Я кладу"), chunk("on the table", "на стіл", "на стол")]),
    line(`Mum sees ${phrase}.`, `Мама бачить ${translation}.`, `Мама видит ${translation}.`, [chunk("Mum sees", "Мама бачить", "Мама видит")]),
    line(`Mum opens ${phrase}.`, `Мама відкриває ${translation}.`, `Мама открывает ${translation}.`, [chunk("Mum opens", "Мама відкриває", "Мама открывает")]),
    last,
  ];
}

export function bagRecallExperience(sentenceCount: number, baseExperience: number) {
  if (sentenceCount <= 1) return baseExperience;
  return (1.5 * sentenceCount - 0.5) * baseExperience;
}

/** Relative effort follows the authored sequence; verified speed adds at most
 * two XP, while the cumulative story uses the explicit 2.5–14.5× formula. */
export function bagStageExperience(stage: BagStage, speedExperience: number) {
  const speedBonus = Math.max(0, Math.min(2, speedExperience - 1));
  if (stage.kind === "BAG_RECALL" || stage.kind === "BAG_REVIEW" && stage.code === "RECALL") return bagRecallExperience(stage.storyIndex ?? 2, speedExperience);
  if (stage.kind === "BAG_SENTENCE") return (stage.sentenceMode === "VISIBLE" ? 5 : 6) + speedBonus;
  if (stage.kind === "BAG_SENTENCE_ASSEMBLE") return 4 + speedBonus;
  if (stage.kind === "BAG_CHUNK") {
    if (stage.chunkCode === "MEANING") return 1 + speedBonus;
    if (stage.chunkCode === "HEAR") return 2 + speedBonus;
    if (stage.chunkCode === "TYPE" || stage.chunkCode === "ASSEMBLE") return 2 + speedBonus;
    return (["RECALL_1", "RECALL_2", "RECALL_3"].includes(stage.chunkCode ?? "") ? 4 : 3) + speedBonus;
  }
  if (stage.code === "CE" || stage.code === "CL") return 1 + speedBonus;
  if (stage.code === "TE" || stage.code === "TL") return 2 + speedBonus;
  return stage.cardNumber === 1 ? 3 + speedBonus : 4 + speedBonus;
}
