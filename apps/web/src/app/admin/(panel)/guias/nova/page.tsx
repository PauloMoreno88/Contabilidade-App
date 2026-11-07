import { Loading } from "@/components/common/Loading";
import { Suspense } from "react";
import { PublishGuide } from "@/components/admin/portal/PublishGuide";

/** ?cliente=<customerId> preselects the customer. */
export default function PublishGuidePage() {
  return (
    <Suspense fallback={<Loading />}>
      <PublishGuide />
    </Suspense>
  );
}
