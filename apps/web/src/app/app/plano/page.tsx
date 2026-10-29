import { Loading } from "@/components/common/Loading";
import { Suspense } from "react";
import { Plan } from "@/components/portal/Plan";

/** ?cancelado=1 when the customer leaves the renewal checkout. */
export default function PlanPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Plan />
    </Suspense>
  );
}
