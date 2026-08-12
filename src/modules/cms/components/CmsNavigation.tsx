"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./CmsNavigation.module.css";

const primaryLinks = [
  { href: "/cms", label: "Overview" },
  { href: "/cms/courses", label: "Courses" },
  { href: "/cms/levels", label: "Curriculum" },
  { href: "/cms/exercise-templates", label: "Exercises" },
  { href: "/cms/media", label: "Media library" },
  { href: "/cms/homepage", label: "Homepage" },
  { href: "/cms/legal", label: "Legal & trust" },
  { href: "/cms/import-export", label: "Import & export" },
  { href: "/cms/audit", label: "Audit history" },
  { href: "/cms/users", label: "Users" },
] as const;

const moreLinks = [
  { href: "/cms/platform-features", label: "Platform features" },
  { href: "/cms/sections", label: "Sections" },
  { href: "/cms/topics", label: "Topics" },
  { href: "/cms/subtopics", label: "Subtopics" },
  { href: "/cms/modules", label: "Modules" },
  { href: "/cms/lessons", label: "Lessons" },
  { href: "/cms/exercises", label: "Exercises list" },
  { href: "/cms/grammar", label: "Grammar rules" },
  { href: "/cms/dashboards", label: "Dashboards" },
  { href: "/cms/navigation", label: "Navigation" },
  { href: "/cms/search", label: "Search" },
  { href: "/cms/translations", label: "Translations" },
  { href: "/cms/revisions", label: "Revisions" },
  { href: "/cms/settings", label: "Settings" },
] as const;

export function CmsNavigation() {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/cms" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const moreIsActive = moreLinks.some((link) => isActive(link.href));

  return (
    <nav aria-label="CMS navigation" className={styles.navigation}>
      <div className={styles.inner}>
        <Link href="/cms" className={styles.brand}>
          KRIN CMS
        </Link>
        <div className={styles.links}>
          {primaryLinks.map((link) => {
            const active = isActive(link.href);
            return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`${styles.link} ${active ? styles.linkActive : ""}`}>{link.label}</Link>;
          })}
          <details className={styles.more}>
            <summary className={`${styles.moreSummary} ${moreIsActive ? styles.linkActive : ""}`}>More</summary>
            <div className={styles.morePanel}>
              {moreLinks.map((link) => {
                const active = isActive(link.href);
                return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`${styles.moreLink} ${active ? styles.moreLinkActive : ""}`}>{link.label}</Link>;
              })}
            </div>
          </details>
        </div>
        <Link href="/student" className={styles.learnerLink}>Open learner view</Link>
      </div>
    </nav>
  );
}
