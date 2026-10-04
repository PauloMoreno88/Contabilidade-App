import { Suspense } from "react";
import { ContractDetail } from "@/components/admin/ContractDetail";

/** Query param instead of a dynamic segment: the site is a static export. */
export default function ContractPage() {
  return (
    <Suspense>
      <ContractDetail />
    </Suspense>
  );
}
