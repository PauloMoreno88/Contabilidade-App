import { Suspense } from "react";
import { Documents } from "@/components/portal/Documents";

/** ?competencia=AAAA-MM (links from e-mails), #<requestId> for one item. */
export default function DocumentsPage() {
  return (
    <Suspense>
      <Documents />
    </Suspense>
  );
}
