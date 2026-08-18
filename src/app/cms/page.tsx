import Link from "next/link";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { CmsLiveOverview } from "@/modules/cms/components/CmsLiveOverview";
import { getCmsLiveOverview } from "@/modules/cms/services/cms-live-overview.service";
import styles from "./CmsOverview.module.css";

export const dynamic = "force-dynamic";

export default async function CmsEntryPage() {
  const overview = await getCmsLiveOverview();

  return (
    <CmsPageShell
      eyebrow="Platform management"
      title="Content CMS"
      description="Manage the live curriculum without editing code. Publication, archive and preview operations are protected on the server and recorded in the audit trail."
      actions={
        <Link href="/cms/courses/new" className={styles.primaryAction}>
          Create course
        </Link>
      }
    >
      <CmsLiveOverview initialOverview={overview} />
    </CmsPageShell>
  );
}
