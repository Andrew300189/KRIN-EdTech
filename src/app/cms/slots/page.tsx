import { CmsContentSlotsWorkspace } from "@/modules/cms/components/CmsContentSlotsWorkspace";
import { listManagedCmsContentSlots } from "@/modules/cms/services/content-slot.service";

export default async function CmsContentSlotsPage() {
  return <CmsContentSlotsWorkspace initialSlots={await listManagedCmsContentSlots()} />;
}
