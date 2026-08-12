import { LegalDocumentPage, legalMetadata } from "@/modules/trust/components/LegalDocumentPage";

export const generateMetadata = () => legalMetadata("payments");
export default function PaymentPolicyPage() { return <LegalDocumentPage document="payments" />; }
