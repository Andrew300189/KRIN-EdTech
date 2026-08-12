import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { SEARCH_CONTEXTS, type SearchContext } from "@/modules/search/types";
import { listUserSearchHistory } from "@/modules/search/services/search-analytics.service";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseContext(value: string | undefined): SearchContext | undefined {
  if (!value) return undefined;
  if (SEARCH_CONTEXTS.includes(value as SearchContext))
    return value as SearchContext;
  return undefined;
}

export default async function ProfileSearchHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authenticated = await requireAuth();
  if (!authenticated) {
    redirect("/login?next=/profile/search-history");
  }

  const params = await searchParams;
  const cursor = Math.max(0, Number(first(params.cursor) ?? "0") || 0);
  const context = parseContext(first(params.context));
  const eventType =
    first(params.eventType) === "CLICK"
      ? "CLICK"
      : first(params.eventType) === "QUERY"
        ? "QUERY"
        : undefined;

  const history = await listUserSearchHistory({
    userId: authenticated.user.id,
    cursor,
    limit: 25,
    context,
    eventType,
  });

  const baseParams = new URLSearchParams();
  if (context) baseParams.set("context", context);
  if (eventType) baseParams.set("eventType", eventType);

  const previousHref = (() => {
    if (history.cursor <= 0) return null;
    const prev = new URLSearchParams(baseParams);
    prev.set("cursor", String(Math.max(0, history.cursor - 25)));
    return `/profile/search-history?${prev.toString()}`;
  })();

  const nextHref = (() => {
    if (history.nextCursor == null) return null;
    const next = new URLSearchParams(baseParams);
    next.set("cursor", String(history.nextCursor));
    return `/profile/search-history?${next.toString()}`;
  })();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Search history
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Your search activity
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Queries and result clicks are listed for your account only.
          </p>
        </div>
        <Link
          href="/profile/analytics"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to analytics
        </Link>
      </header>

      <form
        method="get"
        className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3"
      >
        <select
          name="context"
          defaultValue={context ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All contexts</option>
          {SEARCH_CONTEXTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          name="eventType"
          defaultValue={eventType ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All events</option>
          <option value="QUERY">Queries</option>
          <option value="CLICK">Clicks</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Apply filters
        </button>
      </form>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white">
        {history.items.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">No search activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.items.map((item) => (
              <li key={item.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.query}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {item.eventType}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {item.context} · {new Date(item.createdAt).toLocaleString()}
                </p>
                {item.eventType === "QUERY" ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Results: {item.resultCount ?? 0}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    {item.resultType} · #{item.position ?? 0} ·{" "}
                    {item.resultUrl ?? ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="mt-6 flex items-center gap-3">
        {previousHref ? (
          <Link
            href={previousHref}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
          >
            Previous
          </Link>
        ) : null}
        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
          >
            Next
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
