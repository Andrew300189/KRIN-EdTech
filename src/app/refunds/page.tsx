import { LegalDocumentPage, legalMetadata } from "@/modules/trust/components/LegalDocumentPage";

export const generateMetadata = () => legalMetadata("refunds");
export default function RefundsPage() { return <LegalDocumentPage document="refunds" />; }
