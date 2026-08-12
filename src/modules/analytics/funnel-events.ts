export const funnelEventTypes = [
  "HOME_VIEW",
  "PLACEMENT_TEST_START",
  "PLACEMENT_TEST_COMPLETE",
  "COURSE_CATALOG_VIEW",
  "COURSE_FILTER_USED",
  "COURSE_VIEW",
  "PREVIEW_LESSON_START",
  "PREVIEW_LESSON_COMPLETE",
  "SIGNUP_START",
  "SIGNUP_COMPLETE",
  "PRICING_VIEW",
  "CHECKOUT_START",
  "CHECKOUT_ERROR",
  "PURCHASE_COMPLETE",
  "FIRST_LESSON_START",
  "FIRST_LESSON_COMPLETE",
] as const;

export type FunnelEventType = (typeof funnelEventTypes)[number];

export const funnelDeviceTypes = ["MOBILE", "TABLET", "DESKTOP"] as const;
export type FunnelDeviceType = (typeof funnelDeviceTypes)[number];

export const funnelEventResults = ["STARTED", "SUCCEEDED", "FAILED", "CANCELED", "PENDING"] as const;
export type FunnelEventResult = (typeof funnelEventResults)[number];

export const funnelLevelCodes = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type FunnelLevelCode = (typeof funnelLevelCodes)[number];

export const funnelEventLabels: Record<FunnelEventType, string> = {
  HOME_VIEW: "Home view",
  PLACEMENT_TEST_START: "Placement test started",
  PLACEMENT_TEST_COMPLETE: "Placement test completed",
  COURSE_CATALOG_VIEW: "Course catalogue viewed",
  COURSE_FILTER_USED: "Course filter used",
  COURSE_VIEW: "Course viewed",
  PREVIEW_LESSON_START: "Preview lesson started",
  PREVIEW_LESSON_COMPLETE: "Preview lesson completed",
  SIGNUP_START: "Registration started",
  SIGNUP_COMPLETE: "Registration completed",
  PRICING_VIEW: "Pricing viewed",
  CHECKOUT_START: "Checkout started",
  CHECKOUT_ERROR: "Checkout error",
  PURCHASE_COMPLETE: "Purchase completed",
  FIRST_LESSON_START: "First lesson started",
  FIRST_LESSON_COMPLETE: "First lesson completed",
};
