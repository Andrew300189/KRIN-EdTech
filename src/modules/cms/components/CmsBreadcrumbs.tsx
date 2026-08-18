"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./CmsBreadcrumbs.module.css";

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
  "lesson-templates": "Lesson templates",
  exercises: "Exercises",
  "exercise-templates": "Exercise templates",
  media: "Media",
  dashboards: "Dashboards",
  navigation: "Navigation",
  search: "Search",
  translations: "Translations",
  "import-export": "Import & export",
  revisions: "Revisions",
  audit: "Audit log",
  settings: "Settings",
  sales: "Sales analytics",
  "platform-features": "Platform features",
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

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <ol className={styles.list}>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const current = index === segments.length - 1;

          return (
            <li key={href} className={styles.item}>
              {index > 0 ? <span className={styles.separator} aria-hidden="true">/</span> : null}
              {current ? <span aria-current="page" className={styles.current}>{labelFor(segment)}</span> : <Link href={href} className={styles.link}>{labelFor(segment)}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
