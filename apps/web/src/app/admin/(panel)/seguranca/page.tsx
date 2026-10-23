"use client";

import { useAdminSession } from "@/components/admin/AdminShell";
import { TwoFactorSettings } from "@/components/admin/TwoFactorSettings";

export default function SecurityPage() {
  const { user, reload } = useAdminSession();
  return <TwoFactorSettings user={user} reload={reload} />;
}
