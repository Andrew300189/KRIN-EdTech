import { MAX_QUERY_LENGTH } from "@/modules/search/types";

export function normalizeSearchQuery(input: string) {
  return input
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
