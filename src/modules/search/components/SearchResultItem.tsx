import Link from "next/link";
import type { SearchResult } from "@/modules/search/types";
import { highlightText } from "@/modules/search/utils/highlight";

export function SearchResultItem({
  result,
  query,
  active,
  id,
  position,
  onHover,
  onResultClick,
  onSelect,
}: {
  result: SearchResult;
  query: string;
  active: boolean;
  id: string;
  position: number;
  onHover: () => void;
  onResultClick: () => void;
  onSelect: () => void;
}) {
  return (
    <Link
      id={id}
      href={result.url}
      onMouseEnter={onHover}
      onClick={() => {
        onResultClick();
        onSelect();
      }}
      className={`block rounded-lg px-3 py-2 transition ${active ? "bg-blue-50" : "hover:bg-slate-50"}`}
      data-search-position={position}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{highlightText(result.title, query)}</p>
        {result.badge ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{result.badge}</span> : null}
      </div>
      {result.subtitle ? <p className="mt-1 text-xs text-slate-600">{highlightText(result.subtitle, query)}</p> : null}
      {result.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{highlightText(result.description, query)}</p> : null}
    </Link>
  );
}
