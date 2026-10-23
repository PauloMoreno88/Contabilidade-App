import { Suspense } from "react";
import { Guides } from "@/components/portal/Guides";

/** ?id=<guideId> opens and highlights one guide (links from e-mails). */
export default function GuidesPage() {
  return (
    <Suspense>
      <Guides />
    </Suspense>
  );
}
