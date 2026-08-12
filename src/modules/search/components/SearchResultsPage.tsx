import Link from "next/link";
import { SearchFilters } from "@/modules/search/components/SearchFilters";
import { SEARCH_RESULT_TYPES, type SearchContext, type SearchResultType } from "@/modules/search/types";
import { GlobalSearch } from "@/modules/search/components/GlobalSearch";
import { SearchTrackedLink } from "@/modules/search/components/SearchTrackedLink";
import { SearchService, toSearchPrincipal } from "@/modules/search/services/search.service";
import styles from "./SearchResultsPage.module.css";

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

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

export async function SearchResultsPage({ context, basePath, searchParams, principal }: { context: SearchContext; basePath: string; searchParams: Record<string, string | string[] | undefined>; principal: { userId?: string | null; role?: string | null; locale?: string | null } }) {
  const q = first(searchParams.q) ?? "";
  const cursor = Number(first(searchParams.cursor) ?? "0") || 0;
  const sort = first(searchParams.sort) ?? "relevance";
  const level = first(searchParams.level);
  const category = first(searchParams.category);
  const types = first(searchParams.types);
  let failed = false;
  const response = await SearchService.searchAll({ principal: toSearchPrincipal(principal), query: q, requestedContext: context, cursor, limit: 30, sort: sort as "relevance" | "title" | "newest" | "recent_activity", filters: { level, category, types: parseTypes(types) } }).catch(() => {
    failed = true;
    return { query: q, context, groups: [], items: [], total: 0, cursor: 0, nextCursor: null };
  });
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sort && sort !== "relevance") params.set("sort", sort);
  if (level) params.set("level", level);
  if (category) params.set("category", category);
  if (types) params.set("types", types);
  const positions = new Map<string, number>();
  response.items.forEach((item, index) => positions.set(`${item.type}:${item.id}`, index));

  return <section className={styles.page} aria-labelledby="search-page-title"><header className={styles.header}><p className={styles.eyebrow}>Search the platform</p><h1 id="search-page-title" className={styles.title}>Search</h1><p className={styles.intro}>Find published courses, curriculum topics and available lesson content. Draft and archived content never appears here.</p><div className={styles.searchControl}><GlobalSearch context={context} placeholder="Search courses, lessons, topics and more" /></div><form method="get" className={styles.filterForm}><label className={styles.queryLabel}>Search query<input name="q" defaultValue={q} placeholder="What would you like to learn?" className={styles.queryField} /></label><SearchFilters context={context} defaults={{ sort, level, category, types }} /><button className={styles.applyButton} type="submit">Apply filters</button></form><p className={styles.resultCount} aria-live="polite">{response.total} {response.total === 1 ? "result" : "results"}{q ? ` for “${q}”` : ""}</p>{failed ? <p className={styles.error} role="alert">Search is temporarily unavailable. Please try again.</p> : null}</header>
    {response.items.length === 0 ? <section className={styles.empty}><h2>No matching published content</h2><p>{q ? `Nothing was found for “${response.query}”.` : "Enter a search term or browse the course catalogue."}</p><div className={styles.emptyActions}><Link href="/courses" className={styles.secondaryButton}>Browse catalogue</Link><Link href="/course-finder" className={styles.textLink}>Find a course</Link></div></section> : <section className={styles.groups} aria-label="Search results">{response.groups.map((group) => <article key={group.key} className={styles.group}><h2 className={styles.groupHeading}>{group.label}</h2><ul className={styles.resultList}>{group.items.map((item) => <li key={`${item.type}-${item.id}`}><SearchTrackedLink href={item.url} className={styles.resultLink} context={context} query={response.query} resultType={item.type} resultId={item.id} position={positions.get(`${item.type}:${item.id}`) ?? 0}><div className={styles.resultTitleRow}><p className={styles.resultTitle}>{item.title}</p>{item.badge ? <span className={styles.badge}>{item.badge}</span> : null}</div>{item.subtitle ? <p className={styles.resultSubtitle}>{item.subtitle}</p> : null}{item.description ? <p className={styles.resultDescription}>{item.description}</p> : null}</SearchTrackedLink></li>)}</ul></article>)}</section>}
    <nav className={styles.pagination} aria-label="Search pagination">{cursor > 0 ? <Link href={nextHref(basePath, params, Math.max(0, cursor - 30))} className={styles.secondaryButton}>Previous</Link> : null}{response.nextCursor != null ? <Link href={nextHref(basePath, params, response.nextCursor)} className={styles.secondaryButton}>Next</Link> : null}</nav>
  </section>;
}
