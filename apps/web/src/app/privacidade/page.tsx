import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { legalCopy, privacyPolicy } from "@/config/legal";

export const metadata: Metadata = { title: `${privacyPolicy.title} | Exactra Contabilidade` };

export default function PrivacyPage() {
  return <LegalPage doc={privacyPolicy} other={legalCopy.otherDoc.privacy} />;
}
