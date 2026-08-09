import Link from "next/link";
import { SearchFilters } from "@/modules/search/components/SearchFilters";
import { SEARCH_RESULT_TYPES, type SearchContext, type SearchResultType } from "@/modules/search/types";
import { GlobalSearch } from "@/modules/search/components/GlobalSearch";
import { SearchTrackedLink } from "@/modules/search/components/SearchTrackedLink";
import { SearchService, toSearchPrincipal } from "@/modules/search/services/search.service";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTypes(raw: string | undefined) {
  if (!raw) return undefined;
  const values = raw.split(",").map((item) => item.trim()).filter(Boolean);
  const valid = values.filter((value): value is SearchResultType => SEARCH_RESULT_TYPES.includes(value as SearchResultType));
  return valid.length ? valid : undefined;
}

function nextHref(basePath: string, params: URLSearchParams, cursor: number) {
  const next = new URLSearchParams(params);
  next.set("cursor", String(cursor));
  return `${basePath}?${next.toString()}`;
}

export async function SearchResultsPage({
  context,
  basePath,
  searchParams,
  principal,
}: {
  context: SearchContext;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  principal: { userId?: string | null; role?: string | null; locale?: string | null };
}) {
  const q = first(searchParams.q) ?? "";
  const cursor = Number(first(searchParams.cursor) ?? "0") || 0;
  const sort = first(searchParams.sort) ?? "relevance";
  const level = first(searchParams.level);
  const category = first(searchParams.category);
  const types = first(searchParams.types);

  let failed = false;
  const response = await SearchService.searchAll({
    principal: toSearchPrincipal(principal),
    query: q,
    requestedContext: context,
    cursor,
    limit: 30,
    sort: sort as "relevance" | "title" | "newest" | "recent_activity",
    filters: {
      level,
      category,
      types: parseTypes(types),
    },
  }).catch(() => {
    failed = true;
    return {
      query: q,
      context,
      groups: [],
      items: [],
      total: 0,
      cursor: 0,
      nextCursor: null,
    };
  });

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sort && sort !== "relevance") params.set("sort", sort);
  if (level) params.set("level", level);
  if (category) params.set("category", category);
  if (types) params.set("types", types);

  const positions = new Map<string, number>();
  response.items.forEach((item, index) => {
    positions.set(`${item.type}:${item.id}`, index);
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900">Search</h1>
        <GlobalSearch context={context} placeholder="Search courses, lessons, topics and more" />
        <form method="get" className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <input name="q" defaultValue={q} placeholder="Search query" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <SearchFilters context={context} defaults={{ sort, level, category, types }} />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Apply</button>
        </form>
        <p className="text-sm text-slate-600">{response.total} results</p>
        {failed ? <p className="text-sm text-red-700">Unable to perform search right now. Please retry.</p> : null}
      </header>

      {response.items.length === 0 ? (
        <section className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-700">
          <p>Nothing found for &quot;{response.query}&quot;.</p>
          <p className="mt-2 text-sm">Try another query, remove filters, or open the catalog.</p>
        </section>
      ) : (
        <section className="mt-5 space-y-4">
          {response.groups.map((group) => (
            <article key={group.key} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{group.label}</h2>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <SearchTrackedLink
                      href={item.url}
                      className="block rounded-lg px-3 py-2 hover:bg-slate-50"
                      context={context}
                      query={response.query}
                      resultType={item.type}
                      resultId={item.id}
                      position={positions.get(`${item.type}:${item.id}`) ?? 0}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        {item.badge ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{item.badge}</span> : null}
                      </div>
                      {item.subtitle ? <p className="text-xs text-slate-600">{item.subtitle}</p> : null}
                      {item.description ? <p className="text-xs text-slate-500">{item.description}</p> : null}
                    </SearchTrackedLink>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}

      <nav className="mt-6 flex items-center gap-3">
        {cursor > 0 ? (
          <Link href={nextHref(basePath, params, Math.max(0, cursor - 30))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Previous</Link>
        ) : null}
        {response.nextCursor != null ? (
          <Link href={nextHref(basePath, params, response.nextCursor)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Next</Link>
        ) : null}
      </nav>
    </main>
  );
}
