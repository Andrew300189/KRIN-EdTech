import type { CourseCategory, CourseCategoryData, CourseLevel, CourseLevelData, CourseSubtopic, CourseTopic } from "@/modules/courses/types/course-catalog.types";

const categoryTitles: Record<CourseCategory, string> = {
  grammar: "Grammar", vocabulary: "Vocabulary", "phrasal-verbs": "Phrasal Verbs", idioms: "Idioms",
  "fixed-expressions": "Fixed Expressions", collocations: "Collocations", synonyms: "Synonyms", antonyms: "Antonyms",
  "word-formation": "Word Formation", pronunciation: "Pronunciation", punctuation: "Punctuation", lexicology: "Lexicology",
  phraseology: "Phraseology", speaking: "Speaking", writing: "Writing", reading: "Reading", listening: "Listening",
};

const slugify = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function makeSubtopics(level: CourseLevel, category: CourseCategory, topic: string, names?: string[]): CourseSubtopic[] {
  const base = `${level.toLowerCase()}-${category}-${slugify(topic)}`;
  return (names ?? ["Core forms and meaning", "Guided practice", "Everyday use"]).map((title) => ({
    id: `${base}-${slugify(title)}`, slug: slugify(title), title,
  }));
}

function makeTopics(level: CourseLevel, category: CourseCategory, titles: string[], customSubtopics: Record<string, string[]> = {}): CourseTopic[] {
  return titles.map((title) => ({
    id: `${level.toLowerCase()}-${category}-${slugify(title)}`,
    slug: slugify(title),
    title,
    description: `${title} for ${level} learners.`,
    subtopics: makeSubtopics(level, category, title, customSubtopics[title]),
  }));
}

function category(level: CourseLevel, slug: CourseCategory, topics: string[], customSubtopics?: Record<string, string[]>): CourseCategoryData {
  return { id: `${level.toLowerCase()}-${slug}`, slug, title: categoryTitles[slug], description: `${categoryTitles[slug]} for ${level}.`, topics: makeTopics(level, slug, topics, customSubtopics) };
}

const a1Grammar = [
  "Adjectives and Adverbs", "Articles and Quantifiers", "Zero Conditional", "Future with Will", "Be Going To", "Will for Requests", "Gerund and Infinitive", "Stative Verbs", "Past Simple", "Past Simple of To Be", "Regular and Irregular Verbs", "Can and Can't", "Could and Couldn't", "Must and Mustn't", "Need and Needn't", "Shall", "Prepositions of Place", "Personal Pronouns", "Possessive Forms", "Object Pronouns", "Demonstrative Pronouns", "Indefinite Pronouns", "Have Got", "Have", "To Be", "There Is and There Are", "Present Simple", "Adverbs of Frequency", "Present Continuous", "Present Perfect", "Imperative", "Question Words", "Questions with To Be", "Questions with Have Got", "Present Simple Questions", "Past Simple Questions", "Basic Question Tags",
];

const a2Grammar = ["Extended Adjective and Adverb Forms", "Comparatives and Superlatives", "Irregular Adjectives", "Adverbial Phrases", "Articles", "Zero Conditional", "First Conditional", "Unless and If Only", "Wish", "Conjunctions and Basic Relative Clauses", "Future Forms", "Gerund and Infinitive Patterns", "Modal Verbs", "Past Continuous", "Interrupted Actions", "Prepositions of Time and Place", "Present Simple", "Present Continuous for Future", "Present Perfect", "Reflexive Pronouns", "Expanded Question Structures"];
const b1Grammar = ["-ed and -ing Adjectives", "Comparison Structures", "Zero Conditional", "First Conditional", "Second Conditional", "Third Conditional", "Cause, Effect and Contrast Conjunctions", "Future Continuous", "Passive Voice", "Gerund and Infinitive Patterns", "Probability and Deduction Modals", "Past Perfect", "Past Perfect Continuous", "Used To", "Reported Speech", "Present Perfect Continuous", "Complex Question Tags", "Extended Wh-Questions"];
const b2Grammar = ["Mixed Conditionals", "Advanced Wish Structures", "Future Perfect", "Future Perfect Continuous", "Advanced Modal Deductions", "Modal Perfect Forms", "Should Have Done", "Needn't Have Done", "Would for Past Habits", "Causative Have", "Used To, Be Used To and Get Used To", "Passive Forms of All Tenses", "Advanced Reported Speech", "Narration Tenses", "Relative Clauses", "Auxiliary Agreement Structures", "Advanced Question Tags"];
const c1Grammar = ["Advanced Adjective and Adverb Structures", "Inversion with Negative Adverbials", "Past Modal Structures", "Advanced and Mixed Conditionals", "Wish and If Only", "Advanced Discourse and Syntax", "Advanced Phrasal Verb Structures", "Phrasal Verb Separation"];

const levelDefinitions: Record<CourseLevel, Omit<CourseLevelData, "categories"> & { categories: CourseCategoryData[] }> = {
  A1: { level: "A1", title: "Beginner", description: "Build essential English for familiar everyday situations.", access: "free", categories: [
    category("A1", "grammar", a1Grammar, { "Present Simple": ["Positive forms", "Negative forms", "Questions", "Third-person singular", "Adverbs of frequency", "Habits and routines"] }),
    category("A1", "vocabulary", ["Personal Information", "Family", "Home", "Daily Routine", "Food", "School", "Work", "Countries", "Places and Buildings", "Likes and Dislikes"]),
    category("A1", "pronunciation", ["Alphabet and Letter Names", "Basic Vowel Sounds", "Word Stress", "Simple Intonation"]),
    category("A1", "speaking", ["Introducing Yourself", "Asking for Basic Information", "Daily Conversations"]),
    category("A1", "reading", ["Signs and Notices", "Short Messages", "Simple Descriptions"]),
    category("A1", "listening", ["Greetings and Introductions", "Numbers and Times", "Daily Routines"]),
    category("A1", "writing", ["Personal Profile", "Simple Messages", "Basic Descriptions"]),
    category("A1", "phrasal-verbs", ["Get Up", "Come In", "Go Out"]),
  ] },
  A2: { level: "A2", title: "Elementary", description: "Expand everyday communication and confidence.", access: "free", categories: [
    category("A2", "grammar", a2Grammar),
    category("A2", "vocabulary", ["Jobs", "Travel", "Eating Out", "Health and Medicine", "Nature", "Gadgets and Technology", "Clothes", "Body Parts", "Animals", "Weather", "Do vs Make", "Say vs Tell", "Food Containers"]),
    category("A2", "phrasal-verbs", ["Wake Up", "Find Out", "Look For"]), category("A2", "pronunciation", ["Connected Speech Basics", "Sentence Stress", "Question Intonation"]),
    category("A2", "speaking", ["Making Plans", "Ordering Food", "Describing Experiences"]), category("A2", "reading", ["Emails and Invitations", "Travel Information", "Short Articles"]),
    category("A2", "listening", ["Directions", "Shopping Conversations", "Travel Announcements"]), category("A2", "writing", ["Emails", "Invitations", "Holiday Descriptions"]),
  ] },
  B1: { level: "B1", title: "Intermediate", description: "Use English independently at work, study and travel.", access: "free", categories: [
    category("B1", "grammar", b1Grammar),
    category("B1", "vocabulary", ["Work", "Family", "Food and Drinks", "Climate", "Environment", "Animals", "Housing", "Furniture", "Transport", "Free Time", "Daily Activities"]),
    category("B1", "phrasal-verbs", ["Get Family", "Take Family", "Go, Come and Put"]), category("B1", "idioms", ["Everyday Idioms", "Feelings and Reactions"]),
    category("B1", "collocations", ["Make and Do", "Common Verb Collocations"]), category("B1", "synonyms", ["Common Synonym Choices"]), category("B1", "antonyms", ["Core Opposites"]),
    category("B1", "word-formation", ["Prefixes", "Suffixes", "Noun and Adjective Forms"]), category("B1", "pronunciation", ["Stress, Rhythm and Linking"]),
    category("B1", "speaking", ["Giving Opinions", "Telling Stories", "Workplace Discussions"]), category("B1", "writing", ["Informal Emails", "Opinions and Reviews"]),
    category("B1", "reading", ["News Articles", "Workplace Texts"]), category("B1", "listening", ["Interviews", "Radio Discussions"]),
  ] },
  B2: { level: "B2", title: "Upper-Intermediate", description: "Communicate fluently and precisely in complex situations.", access: "premium", categories: [
    category("B2", "grammar", b2Grammar),
    category("B2", "vocabulary", ["Housing", "Holidays", "Music", "Pets", "Character and Human Qualities", "Work", "Feelings", "Finance", "Environment", "Transport", "Lifestyle"]),
    category("B2", "phrasal-verbs", ["Advanced Get and Take", "Phrasal Verbs for Work", "Separable Phrasal Verbs"]), category("B2", "idioms", ["Idioms and Fixed Phrases", "Business Idioms"]),
    category("B2", "fixed-expressions", ["Natural Conversation Expressions", "Formal and Informal Phrases"]), category("B2", "collocations", ["Adjective Collocations", "Academic Collocations"]),
    category("B2", "synonyms", ["Tone and Register" ]), category("B2", "antonyms", ["Academic Opposites"]), category("B2", "word-formation", ["Advanced Affixes", "Nominalisation"]),
    category("B2", "pronunciation", ["Shadowing and Natural Rhythm", "Contrastive Stress"]), category("B2", "punctuation", ["Commas and Semicolons", "Punctuation for Complex Sentences"]),
    category("B2", "speaking", ["Presentations", "Negotiation", "Debate"]), category("B2", "writing", ["Essays and Reports", "Formal Correspondence"]),
    category("B2", "reading", ["Long-form Articles", "Argumentative Texts"]), category("B2", "listening", ["Lectures", "Fast Natural Speech"]),
  ] },
  C1: { level: "C1", title: "Advanced", description: "Master nuanced, accurate English for academic and professional contexts.", access: "premium", categories: [
    category("C1", "grammar", c1Grammar),
    category("C1", "vocabulary", ["Advanced Vocabulary by Main Spheres", "Formal and Informal Register", "Abstract Vocabulary", "Academic Vocabulary", "Advanced Collocations", "Advanced Phrasal Verbs", "Advanced Idioms"]),
    category("C1", "phrasal-verbs", ["Advanced Phrasal Verb Structures", "Phrasal Verb Separation"]), category("C1", "idioms", ["Advanced Idioms", "Idioms by Register"]),
    category("C1", "fixed-expressions", ["Discourse Markers", "Professional Fixed Expressions"]), category("C1", "collocations", ["Advanced Academic Collocations"]),
    category("C1", "synonyms", ["Precision and Register"]), category("C1", "antonyms", ["Nuanced Contrast Vocabulary"]), category("C1", "word-formation", ["Advanced Nominalisation"]),
    category("C1", "pronunciation", ["Nuance, Emphasis and Delivery"]), category("C1", "punctuation", ["Punctuation for Academic Writing"]), category("C1", "lexicology", ["Lexical Choice and Register"]),
    category("C1", "phraseology", ["Academic and Professional Phraseology"]), category("C1", "speaking", ["Academic Presentations", "Complex Discussions"]),
    category("C1", "writing", ["Academic Essays", "Professional Reports"]), category("C1", "reading", ["Academic and Literary Texts"]), category("C1", "listening", ["Lectures and Panel Discussions"]),
  ] },
  C2: { level: "C2", title: "Mastery", description: "Course content is being prepared.", access: "premium", categories: [] },
};

export const courseCatalog: Record<CourseLevel, CourseLevelData> = levelDefinitions;
