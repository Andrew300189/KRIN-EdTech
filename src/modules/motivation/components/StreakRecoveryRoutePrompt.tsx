"use client";

import { usePathname } from "next/navigation";
import { DailyStreakHeaderStatus } from "./DailyStreakHeaderStatus";

/** The student workspace owns its own streak badge and dialog. Course pages
 * use a separate prompt so a learner returning directly to a lesson also
 * sees a newly lost streak instead of having to visit the dashboard first. */
export function StreakRecoveryRoutePrompt() {
  const pathname = usePathname();
  if (!pathname || !/^\/(?:uk\/|ru\/)?courses(?:\/|$)/.test(pathname)) return null;
  return <DailyStreakHeaderStatus showBadge={false} continueInCurrentLesson={/(?:^|\/)courses\/[^/]+\/lessons\/[^/]+(?:\/|$)/.test(pathname)} />;
}
