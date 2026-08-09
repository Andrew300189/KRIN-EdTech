import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default function CmsSettingsPage() {
  const ownerConfigured = Boolean(process.env.PLATFORM_OWNER_EMAIL?.trim());
  return <CmsPageShell eyebrow="CMS security" title="Settings" description="Only non-sensitive operational state is shown here. Secrets and authentication credentials are never exposed in the CMS."><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-slate-950">Owner access</h2><p className="mt-2 text-sm text-slate-600">PLATFORM_OWNER_EMAIL is {ownerConfigured ? "configured" : "not configured"}. CMS access is enforced on the server for routes and APIs.</p></section></CmsPageShell>;
}
