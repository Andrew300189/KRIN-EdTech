import type { SearchContext } from "@/modules/search/types";

export function SearchFilters({ context, defaults }: { context: SearchContext; defaults: { level?: string; category?: string; sort?: string; types?: string } }) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      <select name="sort" defaultValue={defaults.sort ?? "relevance"} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="relevance">By relevance</option>
        <option value="title">By title</option>
        <option value="newest">Newest first</option>
        <option value="recent_activity">By recent activity</option>
      </select>
      <select name="level" defaultValue={defaults.level ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="">All levels</option>
        {"A1,A2,B1,B2,C1,C2".split(",").map((level) => <option key={level} value={level}>{level}</option>)}
      </select>
      <input name="category" defaultValue={defaults.category ?? ""} placeholder="Category slug" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <input name="types" defaultValue={defaults.types ?? ""} placeholder={context === "PUBLIC" ? "COURSE,LESSON" : "COURSE,ASSIGNMENT"} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </div>
  );
}
