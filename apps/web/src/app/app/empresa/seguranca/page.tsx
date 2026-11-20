"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TwoFactorSettings } from "@/components/admin/TwoFactorSettings";
import { usePortal } from "@/components/portal/PortalShell";
import { PageHeader } from "@/components/portal/ui";
import { portalCopy } from "@/config/portal";

export default function PortalSecurityPage() {
  const { me, reload } = usePortal();
  return (
    <>
      <Link href="/app/empresa" className="mb-4 inline-flex items-center gap-1.5 text-[0.88rem] text-muted hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" />
        {portalCopy.security.back}
      </Link>
      <PageHeader title={portalCopy.security.title} lede={portalCopy.company.changePassword} />
      <TwoFactorSettings user={me.user} reload={reload} />
    </>
  );
}
