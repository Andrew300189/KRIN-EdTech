"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  cms: "CMS",
  courses: "Courses",
  new: "New course",
  levels: "Levels",
  sections: "Sections",
  topics: "Topics",
  subtopics: "Subtopics",
  modules: "Modules",
  lessons: "Lessons",
  exercises: "Exercises",
  "exercise-templates": "Exercise templates",
  media: "Media",
  homepage: "Homepage",
  dashboards: "Dashboards",
  navigation: "Navigation",
  search: "Search",
  translations: "Translations",
  "import-export": "Import & export",
  revisions: "Revisions",
  audit: "Audit log",
  settings: "Settings",
  preview: "Preview",
  content: "Content",
  slots: "Page slots",
};

function labelFor(segment: string) {
  return labels[segment] ?? (segment.length > 18 ? "Item" : segment.replace(/-/g, " "));
}

/** Shared route-aware breadcrumb trail for every owner-only CMS page. */
export function CmsBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return <nav aria-label="Breadcrumb" className="border-b border-slate-200 bg-white">
    <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-2 text-xs font-medium text-slate-500">
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const current = index === segments.length - 1;
        return <li key={href} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          {current ? <span aria-current="page" className="text-slate-800">{labelFor(segment)}</span> : <Link href={href} className="hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">{labelFor(segment)}</Link>}
        </li>;
      })}
    </ol>
  </nav>;
}
