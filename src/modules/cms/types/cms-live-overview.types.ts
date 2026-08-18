export type CmsLiveActivityKind = "REGISTRATION" | "LEARNING" | "PAYMENT";

export type CmsLiveActivity = {
  id: string;
  kind: CmsLiveActivityKind;
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
