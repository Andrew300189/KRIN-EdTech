import { redirect } from "next/navigation";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { CmsNotificationInbox } from "@/modules/cms/components/CmsNotificationInbox";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { getCmsNotificationSummary } from "@/modules/cms/services/cms-notification-inbox.service";

export default async function CmsNotificationsPage() {
  const guard = await requirePlatformOwner();
  if (!guard.ok) redirect(guard.status === 401 ? "/login?callbackUrl=/cms/notifications" : "/student");

  const summary = await getCmsNotificationSummary(guard.user.id);

  return (
    <CmsPageShell
      compact
      dense
      eyebrow="Platform activity"
      title="Notifications"
      description="A calm owner inbox: separate only the events that need a response or review, rather than streaming every platform action."
    >
      <CmsNotificationInbox summary={summary} />
    </CmsPageShell>
  );
}
