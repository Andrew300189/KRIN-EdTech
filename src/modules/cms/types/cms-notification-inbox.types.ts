export const CMS_NOTIFICATION_CATEGORIES = [
  "registrations",
  "payments",
  "account-deletions",
  "support",
  "other",
] as const;

export type CmsNotificationCategory = (typeof CMS_NOTIFICATION_CATEGORIES)[number];

export type CmsNotificationCategorySummary = {
  category: CmsNotificationCategory;
  title: string;
  description: string;
  href: string;
  unreadCount: number;
  latestAt: string | null;
};

export type CmsNotificationSummary = {
  generatedAt: string;
  lastSeenAt: string;
  unreadTotal: number;
  categories: CmsNotificationCategorySummary[];
};

export type CmsNotificationItem = {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  status: string;
  href?: string;
};

export type CmsNotificationDetail = {
  category: CmsNotificationCategory;
  title: string;
  description: string;
  items: CmsNotificationItem[];
};

export const CMS_NOTIFICATION_CATEGORY_META: Record<
  CmsNotificationCategory,
  Pick<CmsNotificationCategorySummary, "title" | "description" | "href">
> = {
  registrations: {
    title: "New registrations",
    description: "Recently created learner and teacher accounts.",
    href: "/cms/notifications/registrations",
  },
  payments: {
    title: "Course payments",
    description: "Confirmed payments that granted course access.",
    href: "/cms/notifications/payments",
  },
  "account-deletions": {
    title: "Account deletions",
    description: "Accounts archived from CMS and available for restoration.",
    href: "/cms/notifications/account-deletions",
  },
  support: {
    title: "Support requests",
    description: "New support tickets from platform users.",
    href: "/cms/notifications/support",
  },
  other: {
    title: "Other signals",
    description: "Failed payments and security events that need attention.",
    href: "/cms/notifications/other",
  },
};

export function isCmsNotificationCategory(value: string): value is CmsNotificationCategory {
  return (CMS_NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}
