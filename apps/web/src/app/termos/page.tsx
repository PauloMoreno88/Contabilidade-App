import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { legalCopy, termsOfUse } from "@/config/legal";

export const metadata: Metadata = { title: `${termsOfUse.title} | Exactra Contabilidade` };

export default function TermsPage() {
  return <LegalPage doc={termsOfUse} other={legalCopy.otherDoc.terms} />;
}
