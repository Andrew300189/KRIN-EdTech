export const SEARCH_CONTEXTS = [
  "PUBLIC",
  "STUDENT",
  "TEACHER",
  "ADMIN",
] as const;
export type SearchContext = (typeof SEARCH_CONTEXTS)[number];

export const SEARCH_RESULT_TYPES = [
  "COURSE",
  "CATEGORY",
  "ACADEMY",
  "LESSON",
  "GRAMMAR_TOPIC",
  "VOCABULARY_TOPIC",
  "HELP_ARTICLE",
  "ASSIGNMENT",
  "GROUP",
  "STUDENT",
  "SUBMISSION",
  "USER_WORD",
  "USER_MISTAKE",
  "ACHIEVEMENT",
] as const;

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

export type SearchSort = "relevance" | "title" | "newest" | "recent_activity";

export type SearchFilters = {
  types?: SearchResultType[];
  level?: string;
  category?: string;
  language?: string;
  onlyMine?: boolean;
  status?: string;
  groupId?: string;
  studentId?: string;
};

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  imageUrl?: string;
  icon?: string;
  badge?: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type SearchGroup = {
  key: string;
  label: string;
  items: SearchResult[];
};

export type SearchResponse = {
  query: string;
  context: SearchContext;
  groups: SearchGroup[];
  items: SearchResult[];
  total: number;
  cursor: number;
  nextCursor: number | null;
  suggestion?: string;
};

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 150;
export const DEBOUNCE_MS = 300;
export const DEFAULT_GROUP_LIMIT = 5;
export const DEFAULT_TOTAL_LIMIT = 20;
