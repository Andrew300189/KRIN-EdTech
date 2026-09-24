export type FlowerRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type FlowerChestDefinition = {
  id: string;
  icon: string;
  hue: number;
  rarity: FlowerRarity;
  /** 1 is widespread in the target flora; 5 is locally exceptional/protected. */
  naturalRarityRank: 1 | 2 | 3 | 4 | 5;
  // The supplied botanical catalogue contains Russian common names. Existing
  // localized flowers retain all three names; a new species safely falls back
  // to its validated source name until a curator adds translations.
  names: { en?: string; ru: string; uk?: string };
  /** Relative XP band. The server clamps the verified chest reward to it. */
  minimumExperience: number;
  maximumExperience: number;
  hintCredits: number;
  translationCredits: number;
  krinCoinMinor: number;
  questBookDenominator: number | null;
  weight: number;
};

/**
 * The drop-rate configuration is deliberately a server module.  It is never
 * returned as a claimable value or accepted from a browser request: a weight
 * only defines the relative chance in the server-side flower pool.
 */
export const FLOWER_DROP_RATE_WEIGHTS = {
  chamomile: 3500,
  poppy: 3000,
  clover: 2700,
  "forget-me-not": 2000,
  lungwort: 900,
  bellflower: 500,
  "lady-slipper": 80,
  "pink-lily": 15,
  // White Lily remains deliberately exceptional. The complete weighted pool
  // also includes the regional flora catalogue below.
  "white-lily": 1,
} as const;

/**
 * The ranks reflect occurrence in the target flora, not flower-shop prices.
 * Chamomile, poppy, red clover and field forget-me-not are widespread across
 * Ukraine, Belarus and large parts of Russia. Lungwort and bellflower are
 * more habitat-bound. Forest lily and lady's slipper orchid are protected in
 * Ukraine, so they sit at the serious end of the reward ladder. The values
 * below keep every rarer tier both less likely and more valuable.
 *
 * Their reward settings are server data, not client input: the server selects
 * the flower and records it with the immutable reward ledger entry.
 */
const CORE_FLOWER_CHESTS: readonly FlowerChestDefinition[] = [
  { id: "chamomile", icon: "🌼", hue: 48, rarity: "COMMON", naturalRarityRank: 1, names: { en: "Chamomile", ru: "Ромашка", uk: "Ромашка" }, minimumExperience: 10, maximumExperience: 45, hintCredits: 0, translationCredits: 0, krinCoinMinor: 0, questBookDenominator: 20, weight: FLOWER_DROP_RATE_WEIGHTS.chamomile },
  { id: "poppy", icon: "🌺", hue: 4, rarity: "COMMON", naturalRarityRank: 1, names: { en: "Poppy", ru: "Мак", uk: "Мак" }, minimumExperience: 20, maximumExperience: 60, hintCredits: 0, translationCredits: 0, krinCoinMinor: 0, questBookDenominator: 18, weight: FLOWER_DROP_RATE_WEIGHTS.poppy },
  { id: "clover", icon: "☘️", hue: 142, rarity: "COMMON", naturalRarityRank: 1, names: { en: "Clover", ru: "Клевер", uk: "Конюшина" }, minimumExperience: 30, maximumExperience: 75, hintCredits: 1, translationCredits: 0, krinCoinMinor: 0, questBookDenominator: 16, weight: FLOWER_DROP_RATE_WEIGHTS.clover },
  { id: "forget-me-not", icon: "🩵", hue: 210, rarity: "COMMON", naturalRarityRank: 1, names: { en: "Forget-me-not", ru: "Незабудка", uk: "Незабудка" }, minimumExperience: 40, maximumExperience: 90, hintCredits: 0, translationCredits: 1, krinCoinMinor: 0, questBookDenominator: 14, weight: FLOWER_DROP_RATE_WEIGHTS["forget-me-not"] },
  { id: "lungwort", icon: "🪻", hue: 273, rarity: "UNCOMMON", naturalRarityRank: 2, names: { en: "Lungwort", ru: "Медуница", uk: "Медунка" }, minimumExperience: 90, maximumExperience: 150, hintCredits: 1, translationCredits: 1, krinCoinMinor: 0, questBookDenominator: 10, weight: FLOWER_DROP_RATE_WEIGHTS.lungwort },
  { id: "bellflower", icon: "🔔", hue: 244, rarity: "UNCOMMON", naturalRarityRank: 2, names: { en: "Bellflower", ru: "Колокольчик", uk: "Дзвіночок" }, minimumExperience: 150, maximumExperience: 220, hintCredits: 2, translationCredits: 1, krinCoinMinor: 0, questBookDenominator: 8, weight: FLOWER_DROP_RATE_WEIGHTS.bellflower },
  { id: "lady-slipper", icon: "👠", hue: 42, rarity: "RARE", naturalRarityRank: 3, names: { en: "Lady's slipper orchid", ru: "Венерин башмачок", uk: "Зозулині черевички" }, minimumExperience: 230, maximumExperience: 350, hintCredits: 2, translationCredits: 2, krinCoinMinor: 10, questBookDenominator: 5, weight: FLOWER_DROP_RATE_WEIGHTS["lady-slipper"] },
  { id: "pink-lily", icon: "🌸", hue: 322, rarity: "EPIC", naturalRarityRank: 4, names: { en: "Forest lily", ru: "Лесная лилия", uk: "Лісова лілія" }, minimumExperience: 360, maximumExperience: 500, hintCredits: 3, translationCredits: 3, krinCoinMinor: 25, questBookDenominator: 3, weight: FLOWER_DROP_RATE_WEIGHTS["pink-lily"] },
  // The white lily has the smallest non-zero weight in the pool. Its exact
  // 1,000 XP reward is enforced on the server, not in this display record.
  { id: "white-lily", icon: "⚜️", hue: 0, rarity: "LEGENDARY", naturalRarityRank: 5, names: { en: "White lily", ru: "Белая лилия", uk: "Біла лілія" }, minimumExperience: 1000, maximumExperience: 1000, hintCredits: 4, translationCredits: 4, krinCoinMinor: 100, questBookDenominator: 1, weight: FLOWER_DROP_RATE_WEIGHTS["white-lily"] },
] as const;

type SuppliedFlowerFrequency = "EXCEPTIONAL" | "PROTECTED" | "LOCAL" | "ORDINARY" | "UBIQUITOUS";
type SuppliedFlowerSeed = { id: string; ru: string; frequency: SuppliedFlowerFrequency; icon?: string };

/**
 * Reward bands follow the four natural-frequency groups supplied for the
 * regional flora. The values are intentionally non-overlapping between the
 * ordinary/local/protected groups: a rarer plant always means a more serious
 * chest, rather than just a different illustration on the same reward.
 */
const SUPPLIED_FREQUENCY_REWARDS: Record<SuppliedFlowerFrequency, Omit<FlowerChestDefinition, "id" | "names" | "icon" | "hue"> & { hue: number; icon: string }> = {
  UBIQUITOUS: { hue: 102, icon: "🌿", rarity: "COMMON", naturalRarityRank: 1, minimumExperience: 10, maximumExperience: 35, hintCredits: 0, translationCredits: 0, krinCoinMinor: 0, questBookDenominator: 24, weight: 420 },
  ORDINARY: { hue: 142, icon: "🌼", rarity: "COMMON", naturalRarityRank: 1, minimumExperience: 40, maximumExperience: 90, hintCredits: 1, translationCredits: 0, krinCoinMinor: 0, questBookDenominator: 16, weight: 200 },
  LOCAL: { hue: 232, icon: "🪻", rarity: "UNCOMMON", naturalRarityRank: 2, minimumExperience: 95, maximumExperience: 200, hintCredits: 1, translationCredits: 1, krinCoinMinor: 0, questBookDenominator: 9, weight: 70 },
  PROTECTED: { hue: 322, icon: "🌸", rarity: "EPIC", naturalRarityRank: 4, minimumExperience: 230, maximumExperience: 500, hintCredits: 2, translationCredits: 2, krinCoinMinor: 10, questBookDenominator: 4, weight: 7 },
  EXCEPTIONAL: { hue: 278, icon: "👻", rarity: "EPIC", naturalRarityRank: 5, minimumExperience: 700, maximumExperience: 700, hintCredits: 4, translationCredits: 4, krinCoinMinor: 50, questBookDenominator: 1, weight: 2 },
};

/**
 * Species supplied by the product owner, grouped by their natural occurrence:
 * protected/rare → local → ordinary → ubiquitous. IDs are stable receipts in
 * the reward ledger, so they are never generated from a translated label.
 */
const SUPPLIED_FLOWER_CATALOGUE: readonly SuppliedFlowerSeed[] = [
  { id: "ghost-orchid", ru: "Надбородник безлистный (орхидея-призрак)", frequency: "EXCEPTIONAL", icon: "👻" },
  { id: "red-helleborine", ru: "Пыльцеголовник красный", frequency: "PROTECTED" },
  { id: "monkey-orchid", ru: "Ятрышник обезьяний", frequency: "PROTECTED" },
  { id: "alpine-edelweiss", ru: "Эдельвейс альпийский", frequency: "PROTECTED" },
  { id: "bieberstein-tulip", ru: "Тюльпан дубравный (Биберштейна)", frequency: "PROTECTED", icon: "🌷" },
  { id: "broadleaf-gladys", ru: "Гладыш широколистный", frequency: "PROTECTED" },
  { id: "water-chestnut", ru: "Водяной орех плавающий (чилим)", frequency: "PROTECTED" },
  { id: "fine-leaved-peony", ru: "Пион тонколистный", frequency: "PROTECTED" },
  { id: "bessers-aconite", ru: "Аконит Бессера", frequency: "PROTECTED" },
  { id: "meadow-pasqueflower", ru: "Прострел раскрытый (сон-трава)", frequency: "PROTECTED" },
  { id: "chequered-fritillary", ru: "Рябчик шахматный", frequency: "PROTECTED" },
  { id: "reticulated-crocus", ru: "Шафран сетчатый (крокус)", frequency: "PROTECTED", icon: "🌷" },
  { id: "spring-adonis", ru: "Горицвет весенний (адонис)", frequency: "PROTECTED" },
  { id: "white-water-lily", ru: "Кувшинка белая", frequency: "PROTECTED", icon: "🪷" },
  { id: "yellow-water-lily", ru: "Кубышка жёлтая", frequency: "PROTECTED", icon: "🪷" },
  { id: "siberian-iris", ru: "Ирис сибирский (касатик)", frequency: "PROTECTED" },
  { id: "common-saw-sedge", ru: "Меч-трава обыкновенная", frequency: "PROTECTED" },
  { id: "great-masterwort", ru: "Астранция крупная", frequency: "PROTECTED" },
  { id: "ramsons", ru: "Лук медвежий (черемша)", frequency: "PROTECTED" },
  { id: "northern-firmoss", ru: "Баранец обыкновенный", frequency: "PROTECTED" },
  { id: "sand-pink", ru: "Гвоздика песчаная", frequency: "PROTECTED" },
  { id: "wood-anemone", ru: "Анемона дубравная (ветреница)", frequency: "PROTECTED" },
  { id: "common-snowdrop", ru: "Подснежник белоснежный", frequency: "PROTECTED" },

  { id: "three-lobed-fern", ru: "Голокучник трёхраздельный", frequency: "LOCAL" },
  { id: "greater-butterfly-orchid", ru: "Любка двулистная (ночная фиалка)", frequency: "LOCAL" },
  { id: "solomons-seal", ru: "Купена многоцветковая", frequency: "LOCAL" },
  { id: "cowslip", ru: "Первоцвет весенний (примула)", frequency: "LOCAL" },
  { id: "marsh-marigold", ru: "Калужница болотная", frequency: "LOCAL" },
  { id: "broad-leaved-bellflower", ru: "Колокольчик широколистный", frequency: "LOCAL", icon: "🔔" },
  { id: "pipsissewa", ru: "Зимолюбка зонтичная", frequency: "LOCAL" },
  { id: "columbine-meadow-rue", ru: "Василистник водосборолистный", frequency: "LOCAL" },
  { id: "purple-goatsbeard", ru: "Козелец пурпурный", frequency: "LOCAL" },
  { id: "marsh-gentian", ru: "Горечавка лёгочная", frequency: "LOCAL" },
  { id: "dyers-greenweed", ru: "Дрок красильный", frequency: "LOCAL" },
  { id: "soapwort", ru: "Мыльнянка лекарственная", frequency: "LOCAL" },
  { id: "wood-geranium", ru: "Герань лесная", frequency: "LOCAL" },
  { id: "meadowsweet", ru: "Таволга вязолистная (лабазник)", frequency: "LOCAL" },
  { id: "mezereon", ru: "Волчеягодник обыкновенный (волчье лыко)", frequency: "LOCAL" },
  { id: "three-lobed-beggarticks", ru: "Череда трёхраздельная", frequency: "LOCAL" },
  { id: "umbrella-hawkweed", ru: "Ястребинка зонтичная", frequency: "LOCAL" },
  { id: "meadow-buttercup", ru: "Лютик едкий", frequency: "LOCAL" },
  { id: "meadow-sage", ru: "Шалфей луговой", frequency: "LOCAL" },
  { id: "water-avens", ru: "Гравилат речной", frequency: "LOCAL" },
  { id: "lily-of-the-valley", ru: "Ландыш майский", frequency: "LOCAL" },
  { id: "siberian-squill", ru: "Пролеска сибирская", frequency: "LOCAL" },
  { id: "dense-fumewort", ru: "Хохлатка плотная", frequency: "LOCAL" },
  { id: "lesser-celandine", ru: "Чистяк весенний", frequency: "LOCAL" },

  { id: "st-johns-wort", ru: "Зверобой продырявленный", frequency: "ORDINARY" },
  { id: "common-yarrow", ru: "Тысячелистник обыкновенный", frequency: "ORDINARY" },
  { id: "cornflower", ru: "Василёк синий", frequency: "ORDINARY" },
  { id: "oxeye-daisy", ru: "Нивяник обыкновенный (полевая ромашка)", frequency: "ORDINARY" },
  { id: "fireweed", ru: "Иван-чай узколистный (кипрей)", frequency: "ORDINARY" },
  { id: "spreading-bellflower", ru: "Колокольчик раскидистый", frequency: "ORDINARY", icon: "🔔" },
  { id: "white-clover", ru: "Клевер ползучий (белый)", frequency: "ORDINARY" },
  { id: "common-chicory", ru: "Цикорий обыкновенный", frequency: "ORDINARY" },
  { id: "common-tansy", ru: "Пижма обыкновенная", frequency: "ORDINARY" },
  { id: "thorn-apple", ru: "Дурман обыкновенный", frequency: "ORDINARY" },
  { id: "wood-sorrel", ru: "Кислица обыкновенная", frequency: "ORDINARY" },
  { id: "germander-speedwell", ru: "Вероника дубравная", frequency: "ORDINARY" },
  { id: "yellow-sweetclover", ru: "Донник лекарственный (жёлтый)", frequency: "ORDINARY" },
  { id: "alfalfa", ru: "Люцерна посевная", frequency: "ORDINARY" },
  { id: "ladys-bedstraw", ru: "Подмаренник настоящий", frequency: "ORDINARY" },
  { id: "lanceolate-starwort", ru: "Звездчатка ланцетовидная", frequency: "ORDINARY" },
  { id: "meadow-geranium", ru: "Герань луговая", frequency: "ORDINARY" },
  { id: "bird-cherry", ru: "Черёмуха обыкновенная", frequency: "ORDINARY" },
  { id: "great-mullein", ru: "Коровяк скипетровидный", frequency: "ORDINARY" },
  { id: "toadflax", ru: "Льнянка обыкновенная", frequency: "ORDINARY" },
  { id: "field-bindweed", ru: "Вьюнок полевой", frequency: "ORDINARY" },
  { id: "charlock", ru: "Сурепка обыкновенная", frequency: "ORDINARY" },
  { id: "cuckooflower", ru: "Сердечник луговой", frequency: "ORDINARY" },

  { id: "dandelion", ru: "Одуванчик лекарственный", frequency: "UBIQUITOUS" },
  { id: "broadleaf-plantain", ru: "Подорожник большой", frequency: "UBIQUITOUS" },
  { id: "coltsfoot", ru: "Мать-и-мачеха обыкновенная", frequency: "UBIQUITOUS" },
  { id: "stinging-nettle", ru: "Крапива двудомная", frequency: "UBIQUITOUS" },
  { id: "greater-burdock", ru: "Лопух большой (репейник)", frequency: "UBIQUITOUS" },
  { id: "creeping-thistle", ru: "Бодяк полевой", frequency: "UBIQUITOUS" },
  { id: "shepherds-purse", ru: "Пастушья сумка", frequency: "UBIQUITOUS" },
  { id: "white-dead-nettle", ru: "Яснотка белая", frequency: "UBIQUITOUS" },
  { id: "pharmacy-chamomile", ru: "Ромашка аптечная", frequency: "UBIQUITOUS" },
  { id: "knotgrass", ru: "Горец птичий (спорыш)", frequency: "UBIQUITOUS" },
  { id: "orache", ru: "Лебеда раскидистая", frequency: "UBIQUITOUS" },
  { id: "white-goosefoot", ru: "Марь белая", frequency: "UBIQUITOUS" },
  { id: "couch-grass", ru: "Пырей ползучий", frequency: "UBIQUITOUS" },
  { id: "oriental-bunias", ru: "Свербига восточная", frequency: "UBIQUITOUS" },
  { id: "spear-thistle", ru: "Чертополох колючий", frequency: "UBIQUITOUS" },
  { id: "common-fumitory", ru: "Дымянка лекарственная", frequency: "UBIQUITOUS" },
  { id: "common-chickweed", ru: "Звездчатка средняя (мокрица)", frequency: "UBIQUITOUS" },
  { id: "white-sweetclover", ru: "Донник белый", frequency: "UBIQUITOUS" },
  { id: "greater-celandine", ru: "Чистотел большой", frequency: "UBIQUITOUS" },
  { id: "poison-hemlock", ru: "Болиголов пятнистый", frequency: "UBIQUITOUS" },
  { id: "sosnovsky-hogweed", ru: "Борщевик Сосновского", frequency: "UBIQUITOUS" },
  { id: "canadian-fleabane", ru: "Мелколепестник канадский", frequency: "UBIQUITOUS" },
  { id: "gallant-soldier", ru: "Галинсога мелкоцветковая", frequency: "UBIQUITOUS" },
  { id: "black-nightshade", ru: "Паслён чёрный", frequency: "UBIQUITOUS" },
  { id: "field-pennycress", ru: "Ярутка полевая", frequency: "UBIQUITOUS" },
] as const;

function flowerFromSuppliedCatalogue(seed: SuppliedFlowerSeed): FlowerChestDefinition {
  const profile = SUPPLIED_FREQUENCY_REWARDS[seed.frequency];
  return {
    id: seed.id,
    icon: seed.icon ?? profile.icon,
    hue: profile.hue,
    rarity: profile.rarity,
    naturalRarityRank: profile.naturalRarityRank,
    names: { ru: seed.ru },
    minimumExperience: profile.minimumExperience,
    maximumExperience: profile.maximumExperience,
    hintCredits: profile.hintCredits,
    translationCredits: profile.translationCredits,
    krinCoinMinor: profile.krinCoinMinor,
    questBookDenominator: profile.questBookDenominator,
    weight: profile.weight,
  };
}

export const FLOWER_CHESTS: readonly FlowerChestDefinition[] = [
  ...CORE_FLOWER_CHESTS,
  ...SUPPLIED_FLOWER_CATALOGUE.map(flowerFromSuppliedCatalogue),
];

/** A Water Lily is an inventory item, awarded beside an ordinary flower. */
export const WATER_LILY = {
  id: "water-lily",
  icon: "🪷",
  names: { en: "Water lily", ru: "Кувшинка", uk: "Латаття" },
} as const;
export const WHITE_LILY_FLOWER_ID = "white-lily";

export function flowerChestById(id: string | null | undefined) {
  return FLOWER_CHESTS.find((flower) => flower.id === id) ?? null;
}

/** A chest milestone belongs to exactly one 50-correct-answer band. */
export function flowerRestoreCycle(milestone: number) {
  return Math.max(0, Math.floor((Math.max(1, Math.trunc(milestone)) - 1) / 50));
}

export function isWhiteLily(flower: FlowerChestDefinition) {
  return flower.id === WHITE_LILY_FLOWER_ID;
}

/**
 * Select from the ordinary flower pool without repeating the previous flower.
 * `roll` is supplied by the server's cryptographic RNG, which keeps this
 * module deterministic and straightforward to unit test.
 */
export function selectRandomFlowerChest(lastFlowerId: string | null, roll: (exclusiveMaximum: number) => number) {
  const candidates = FLOWER_CHESTS.filter((flower) => flower.weight > 0 && flower.id !== lastFlowerId);
  const pool = candidates.length ? candidates : FLOWER_CHESTS.filter((flower) => flower.weight > 0);
  const totalWeight = pool.reduce((total, flower) => total + flower.weight, 0);
  let ticket = roll(totalWeight);
  for (const flower of pool) {
    if (ticket < flower.weight) return flower;
    ticket -= flower.weight;
  }
  return pool[pool.length - 1]!;
}
