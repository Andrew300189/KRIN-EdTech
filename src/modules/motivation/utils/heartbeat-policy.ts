import { MOTIVATION_CONFIG } from "@/modules/motivation/constants/motivation-config";

export function determineHeartbeatCredit(input: { elapsedSeconds: number; activeSessionSeconds: number; dailyActiveSeconds: number; interactionAdvanced: boolean; clientTimestampFutureSeconds: number; replayed: boolean }) {
  if (input.clientTimestampFutureSeconds > MOTIVATION_CONFIG.heartbeat.futureToleranceSeconds) return { creditedSeconds: 0, status: "ACTIVE" as const, reason: "future_timestamp" };
  if (input.replayed) return { creditedSeconds: 0, status: "ACTIVE" as const, reason: "replayed_heartbeat" };
  if (input.elapsedSeconds > MOTIVATION_CONFIG.heartbeat.maximumIntervalSeconds) return { creditedSeconds: 0, status: "PAUSED" as const, reason: "excessive_gap" };
  if (!input.interactionAdvanced) return { creditedSeconds: 0, status: "ACTIVE" as const, reason: "no_interaction" };
  if (input.elapsedSeconds < MOTIVATION_CONFIG.heartbeat.minimumIntervalSeconds) return { creditedSeconds: 0, status: "ACTIVE" as const, reason: "interval_too_short" };
  const creditedSeconds = Math.min(input.elapsedSeconds, MOTIVATION_CONFIG.heartbeat.maximumCreditedSeconds, Math.max(0, MOTIVATION_CONFIG.heartbeat.maximumSessionSeconds - input.activeSessionSeconds), Math.max(0, MOTIVATION_CONFIG.heartbeat.maximumDailySeconds - input.dailyActiveSeconds));
  return { creditedSeconds, status: "ACTIVE" as const, reason: creditedSeconds ? "credited" : "daily_or_session_limit" };
}
