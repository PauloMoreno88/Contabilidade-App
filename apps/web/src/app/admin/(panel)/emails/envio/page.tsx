import { Suspense } from "react";
import { Loading } from "@/components/common/Loading";
import { EmailCampaignDetail } from "@/components/admin/EmailHistory";

export default function EmailCampaignPage() {
  return <Suspense fallback={<Loading />}><EmailCampaignDetail /></Suspense>;
}
