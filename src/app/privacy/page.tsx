import { LegalDocumentPage, legalMetadata } from "@/modules/trust/components/LegalDocumentPage";

export const generateMetadata = () => legalMetadata("privacy");
export default function PrivacyPage() { return <LegalDocumentPage document="privacy" />; }
