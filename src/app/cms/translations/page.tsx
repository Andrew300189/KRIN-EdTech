import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default function CmsTranslationsPage() {
  return <CmsPageShell eyebrow="Localization" title="Translations" description="Interface language preferences exist, but course and lesson translations are not stored separately yet."><CmsEmptyState title="No content translations yet" description="The next data migration will add locale-specific content with an English fallback. It will not duplicate courses, modules or lessons." /></CmsPageShell>;
}
