import ProfileAnalyticsPage from "@/app/profile/analytics/page";

export default function DashboardAnalyticsPage() {
  return <ProfileAnalyticsPage searchParams={Promise.resolve({})} />;
}
