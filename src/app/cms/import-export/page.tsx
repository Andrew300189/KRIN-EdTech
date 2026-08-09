import { CmsImportExportWorkspace } from "@/modules/cms/components/CmsImportExportWorkspace";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default function CmsImportExportPage() {
  return <CmsPageShell eyebrow="Content transfer" title="Import and export" description="Transfer versioned course structures safely. Imported courses are never published automatically."><CmsImportExportWorkspace /></CmsPageShell>;
}
