import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default function CmsNavigationPage() {
  return <CmsPageShell eyebrow="Presentation" title="Navigation" description="Navigation is currently defined by typed App Router layouts, not by a CMS table. This prevents an owner error from removing access to core product areas."><CmsEmptyState title="No editable navigation records" description="A future navigation model must retain protected system routes and validate internal destinations. It should not use unvalidated URLs or replace role-based navigation." /></CmsPageShell>;
}
