import type { SearchResult } from "@/modules/search/types";

export function calculateSearchRank(input: {
  query: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  keywords?: string[];
  boosts?: {
    popular?: boolean;
    mine?: boolean;
    active?: boolean;
    inProgress?: boolean;
  };
}) {
  const query = input.query.toLocaleLowerCase("en");
  const title = input.title.toLocaleLowerCase("en");
  const subtitle = (input.subtitle ?? "").toLocaleLowerCase("en");
  const description = (input.description ?? "").toLocaleLowerCase("en");

  let score = 0;
  if (title === query) score += 100;
  if (title.startsWith(query)) score += 70;
  if (title.includes(query)) score += 45;

  if (
    input.keywords?.some((keyword) =>
      keyword.toLocaleLowerCase("en").includes(query),
    )
  ) {
    score += 30;
  }

  if (subtitle.includes(query)) score += 20;
  if (description.includes(query)) score += 10;

  if (input.boosts?.popular) score += 8;
  if (input.boosts?.mine) score += 25;
  if (input.boosts?.active) score += 12;
  if (input.boosts?.inProgress) score += 10;

  return score;
}

export function sortSearchResults(
  items: SearchResult[],
  sort: "relevance" | "title" | "newest" | "recent_activity",
) {
  if (sort === "title") {
    return [...items].sort((a, b) => a.title.localeCompare(b.title));
  }
  if (sort === "newest" || sort === "recent_activity") {
    return [...items].sort((a, b) => {
      const aAt = Number((a.metadata?.updatedAt as number | undefined) ?? 0);
      const bAt = Number((b.metadata?.updatedAt as number | undefined) ?? 0);
      return bAt - aAt || b.score - a.score;
    });
  }
  return [...items].sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title),
  );
}
