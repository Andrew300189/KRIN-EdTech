import { LegalDocumentPage, legalMetadata, requireLegalDocument } from "@/modules/trust/components/LegalDocumentPage";

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }) {
  return legalMetadata(requireLegalDocument((await params).document));
}

export default async function PublicLegalDocumentPage({ params }: { params: Promise<{ document: string }> }) {
  return <LegalDocumentPage document={requireLegalDocument((await params).document)} />;
}
