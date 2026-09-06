"use client";

import Link from "next/link";
import { useLocale } from "@/core/i18n/locale";
import styles from "./StudentHome.module.css";

type PlacementRecommendation = {
  id: string;
  slug: string;
  title: string;
  accessPlan: string;
  category: string;
};

type PlacementResult = {
  level: string | null;
  recommendationLevel: string;
  scorePercent: number;
  correctAnswers: number;
  questionCount: number;
  recommendations: PlacementRecommendation[];
};

/**
 * The post-test course suggestion is intentionally a one-time hand-off. By
 * replacing the dashboard history entry before navigation, returning with the
 * browser Back button does not surface the same recommendation again.
 */
export function PlacementRecommendationPanel({ result }: { result: PlacementResult }) {
  const { t } = useLocale();
  const dismissRecommendation = () => {
    window.history.replaceState(window.history.state, "", "/student");
  };

  return <section className={styles.placementPanel} aria-label={t("student.placement.aria")}>
    <div className={styles.placementSummary}>
      <p className={styles.eyebrow}>{t("student.placement.result")}</p>
      <div className={styles.placementHeading}>
        <span className={styles.placementLevel}>{result.level ?? "A1"}</span>
        <div>
          <h3>{result.level ? t("student.placement.startAt", { level: result.level }) : t("student.placement.foundation")}</h3>
          <p>{result.level ? t("student.placement.score", { correct: result.correctAnswers, total: result.questionCount, score: result.scorePercent }) : t("student.placement.foundationCopy", { score: result.scorePercent })}</p>
        </div>
      </div>
    </div>
    <div className={styles.placementRecommendations}>
      <div className={styles.placementRecommendationsHeading}>
        <div><p>{t("student.placement.recommended", { level: result.recommendationLevel })}</p><span>{t("student.placement.matchedCourses")}</span></div>
        <Link href={`/student/catalog?level=${result.recommendationLevel}`} onClick={dismissRecommendation} className={styles.placementCatalogLink}>{t("student.placement.myCourses", { level: result.recommendationLevel })}</Link>
      </div>
      {result.recommendations.length ? <div className={styles.placementCourseList}>{result.recommendations.map((course) => <Link key={course.id} href={`/courses/catalog/${course.slug}`} onClick={dismissRecommendation} className={styles.placementCourse}><span>{course.category}</span><strong>{course.title}</strong><small>{course.accessPlan === "FREE" ? t("student.placement.freeToStart") : t("student.placement.accessAvailable")}</small></Link>)}</div> : <div className={styles.placementEmpty}><p>{t("student.placement.preparing", { level: result.recommendationLevel })}</p><Link href={`/student/catalog?level=${result.recommendationLevel}`} onClick={dismissRecommendation}>{t("student.placement.browseLevel")}</Link></div>}
    </div>
  </section>;
}
