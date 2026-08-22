export type CmsLiveActivityKind = "SECURITY" | "BILLING" | "SUPPORT";

export type CmsLiveActivityType =
  | "SECURITY_ALERT"
  | "PAYMENT_FAILURE"
  | "URGENT_SUPPORT";

export type CmsLiveActivitySeverity = "CRITICAL" | "HIGH";

export type CmsLiveActivity = {
  id: string;
  kind: CmsLiveActivityKind;
  type: CmsLiveActivityType;
  severity: CmsLiveActivitySeverity;
  title: string;
  detail: string;
  occurredAt: string;
};

export type CmsLiveOverview = {
  generatedAt: string;
  users: {
    accounts: number;
    students: number;
    teachers: number;
    registrationsLast24Hours: number;
    registrationsLast7Days: number;
  };
  courses: {
    total: number;
    published: number;
    drafts: number;
    scheduled: number;
  };
  payments: {
    confirmed: number;
    failed: number;
  };
  support: {
    open: number;
  };
  operations: {
    activeEnrollments: number;
    reusableMediaAssets: number;
    structuredPageSlots: number;
  };
  recentActivity: CmsLiveActivity[];
};
