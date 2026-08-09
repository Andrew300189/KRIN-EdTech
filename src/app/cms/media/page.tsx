import { CmsMediaWorkspace } from "@/modules/cms/components/CmsMediaWorkspace";
import { listManagedCmsMediaAssets } from "@/modules/cms/services/media.service";

export default async function CmsMediaPage() {
  return <CmsMediaWorkspace initialAssets={await listManagedCmsMediaAssets(true)} />;
}
