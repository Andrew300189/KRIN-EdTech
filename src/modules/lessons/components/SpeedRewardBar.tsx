import { speedRewardVisualState } from "@/modules/courses/utils/exercise-speed-reward";
import styles from "./SpeedRewardBar.module.css";

/** Shared by grammar exercises and vocabulary cards; XP timing stays server-owned. */
export function SpeedRewardBar({ remainingPercent, compact = false }: { remainingPercent: number; compact?: boolean }) {
  const visual = speedRewardVisualState(remainingPercent);
  return <div className={`${styles.track} ${compact ? styles.compact : ""} ${visual.critical ? styles.critical : ""}`} aria-hidden="true" data-speed-zone={visual.critical ? "red" : "normal"}>
    <span className={styles.fill} style={{ width: `${visual.percent}%`, backgroundColor: visual.color }} />
  </div>;
}
