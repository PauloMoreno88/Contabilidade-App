import { Loading } from "@/components/common/Loading";
import { Suspense } from "react";
import { CustomerFile } from "@/components/admin/portal/CustomerFile";

/** ?id=<customerId>&aba=documents|guides|access|checklist&competencia=AAAA-MM */
export default function CustomerPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CustomerFile />
    </Suspense>
  );
}
