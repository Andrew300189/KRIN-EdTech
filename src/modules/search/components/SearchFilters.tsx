import type { SearchContext } from "@/modules/search/types";
import styles from "./SearchFilters.module.css";

export function SearchFilters({ context, defaults }: { context: SearchContext; defaults: { level?: string; category?: string; sort?: string; types?: string } }) {
  return <fieldset className={styles.filters}><legend className={styles.legend}>Refine results</legend><div className={styles.grid}>
    <label className={styles.label}>Sort<select name="sort" defaultValue={defaults.sort ?? "relevance"} className={styles.field}><option value="relevance">By relevance</option><option value="title">By title</option><option value="newest">Newest first</option><option value="recent_activity">By recent activity</option></select></label>
    <label className={styles.label}>Level<select name="level" defaultValue={defaults.level ?? ""} className={styles.field}><option value="">All levels</option>{"A1,A2,B1,B2,C1,C2".split(",").map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
    <label className={styles.label}>Category<input name="category" defaultValue={defaults.category ?? ""} placeholder="e.g. business-english" className={styles.field} /></label>
    <label className={styles.label}>Content type<input name="types" defaultValue={defaults.types ?? ""} placeholder={context === "PUBLIC" ? "COURSE,LESSON" : "COURSE,ASSIGNMENT"} className={styles.field} /></label>
  </div></fieldset>;
}
