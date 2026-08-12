import { LegalDocumentPage, legalMetadata } from "@/modules/trust/components/LegalDocumentPage";

export const generateMetadata = () => legalMetadata("terms");
export default function TermsPage() { return <LegalDocumentPage document="terms" />; }
