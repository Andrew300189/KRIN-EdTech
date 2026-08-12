import styles from "../course-view.module.css";

export default function CourseOrLevelLoading() {
  return <main className={styles.page} aria-busy="true" aria-label="Loading course">
    <div className={styles.shell}>
      <div className={styles.courseHero}><p className={styles.eyebrow}>Loading course</p><h1>Preparing the published course outline…</h1><p>Course details and lesson availability are loading.</p></div>
    </div>
  </main>;
}
