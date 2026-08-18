export const NOTIFICATION_BADGE_SECTIONS = [
  "courses",
  "vocabulary",
  "achievements",
  "billing",
  "support",
  "settings",
] as const;

export type NotificationBadgeSection = (typeof NOTIFICATION_BADGE_SECTIONS)[number];
