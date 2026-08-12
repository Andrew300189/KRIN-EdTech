import type { ReactNode } from "react";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import { CourseBreadcrumbs, type Breadcrumb } from "@/modules/courses/components/CourseBreadcrumbs";
import styles from "./PublicCurriculumLayout.module.css";

type PublicCurriculumLayoutProps = {
  breadcrumbs: Breadcrumb[];
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** Shared public shell for the typed A1–C2 curriculum tree. */
export function PublicCurriculumLayout({
  breadcrumbs,
  eyebrow,
  title,
  description,
  children,
}: PublicCurriculumLayoutProps) {
  return (
    <main className={styles.page}>
      <PublicSiteHeader />
      <div className={styles.shell}>
        <CourseBreadcrumbs items={breadcrumbs} />
        <header className={styles.header}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
