"use client";

import Link from "next/link";
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
  const dismissRecommendation = () => {
    window.history.replaceState(window.history.state, "", "/student");
  };

  return <section className={styles.placementPanel} aria-label="Your placement test result">
    <div className={styles.placementSummary}>
      <p className={styles.eyebrow}>Your placement result</p>
      <div className={styles.placementHeading}>
        <span className={styles.placementLevel}>{result.level ?? "A1"}</span>
        <div>
          <h3>{result.level ? `You are ready to start at ${result.level}` : "Start with an A1 foundation"}</h3>
          <p>{result.level ? `${result.correctAnswers} of ${result.questionCount} answers correct · ${result.scorePercent}% overall` : `Your first result was ${result.scorePercent}%. Build the basics with an A1 route, then retake the test when you are ready.`}</p>
        </div>
      </div>
    </div>
    <div className={styles.placementRecommendations}>
      <div className={styles.placementRecommendationsHeading}>
        <div><p>Recommended for {result.recommendationLevel}</p><span>Published courses matched to your result</span></div>
        <Link href={`/student/catalog?level=${result.recommendationLevel}`} onClick={dismissRecommendation} className={styles.placementCatalogLink}>My {result.recommendationLevel} courses</Link>
      </div>
      {result.recommendations.length ? <div className={styles.placementCourseList}>{result.recommendations.map((course) => <Link key={course.id} href={`/courses/catalog/${course.slug}`} onClick={dismissRecommendation} className={styles.placementCourse}><span>{course.category}</span><strong>{course.title}</strong><small>{course.accessPlan === "FREE" ? "Free to start" : "Access available"}</small></Link>)}</div> : <div className={styles.placementEmpty}><p>Courses for {result.recommendationLevel} are being prepared. You can still browse the available catalogue.</p><Link href={`/student/catalog?level=${result.recommendationLevel}`} onClick={dismissRecommendation}>Browse my level</Link></div>}
    </div>
  </section>;
}
