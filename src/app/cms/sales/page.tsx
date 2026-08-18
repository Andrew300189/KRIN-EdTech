import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { CmsSalesAnalyticsWorkspace } from "@/modules/cms/components/CmsSalesAnalyticsWorkspace";
import { getCmsSalesAnalytics, parseCmsSalesFilters } from "@/modules/cms/services/cms-sales-analytics.service";

export default async function CmsSalesPage({ searchParams }: { searchParams: Promise<{ period?: string; productId?: string; from?: string; to?: string }> }) {
  const filters = parseCmsSalesFilters(await searchParams);
  const report = await getCmsSalesAnalytics(filters);
  return <CmsPageShell eyebrow="Commerce" title="Sales analytics" description="Confirmed sales, buyers and course demand from the canonical billing records. Amounts are always kept in their original currency."><CmsSalesAnalyticsWorkspace report={report} /></CmsPageShell>;
}
