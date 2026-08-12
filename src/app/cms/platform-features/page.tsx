import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { CmsPlatformFeatureRegistry } from "@/modules/cms/components/CmsPlatformFeatureRegistry";
import { platformFeatureRegistry } from "@/modules/cms/data/platform-feature-registry";

export default function CmsPlatformFeaturesPage() {
  return (
    <CmsPageShell
      eyebrow="System visibility"
      title="Platform features"
      description="An owner-only, read-only inventory of verified capabilities. It distinguishes working user paths from partial, internal and intentionally blocked functionality without exposing internal endpoints."
    >
      <CmsPlatformFeatureRegistry features={platformFeatureRegistry} />
    </CmsPageShell>
  );
}
