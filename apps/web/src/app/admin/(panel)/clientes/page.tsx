import { Loading } from "@/components/common/Loading";
import { Suspense } from "react";
import { Customers } from "@/components/admin/portal/Customers";

/** ?apagado=<name> after a delete. */
export default function CustomersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Customers />
    </Suspense>
  );
}
