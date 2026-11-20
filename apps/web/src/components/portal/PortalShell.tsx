"use client";

import { AsyncButton } from "@/components/common/AsyncButton";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { whatsappLink, type PortalMe } from "@exactra/shared";
import { portalCopy, portalNav } from "@/config/portal";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { formatDate, formatDocument } from "@/lib/format";
import { LoadState } from "./ui";
import { WorkspaceShell } from "@/components/common/WorkspaceShell";

const copy = portalCopy;
type Ctx = { me: PortalMe; reload: () => Promise<void>; writable: boolean };
const PortalContext = createContext<Ctx | null>(null);

/** Signed-in customer, their company and what they may do. */
export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used inside PortalShell");
  return ctx;
}

const isActive = (pathname: string, href: string) => (href === "/app" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(href));

/**
 * Customer area chrome shares the admin workspace; access rules stay here.
 * Client-side guard for UX only: the API refuses /app routes to anyone but the company's members.
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<PortalMe | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) return router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
    if (data.user.role === "admin") return router.replace("/admin/mes");
    try {
      setMe(await api.me());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [router, pathname]);

  useEffect(() => {
    reload();
  }, [reload]);

  // First access: the onboarding steps come before everything else.
  const onboarding = pathname.startsWith("/app/boas-vindas");
  useEffect(() => {
    if (me?.company && !me.onboarded && !onboarding && me.access.level !== "BLOCKED") router.replace("/app/boas-vindas");
  }, [me, onboarding, router]);

  async function signOut() {
    await authClient.signOut();
    router.replace("/entrar");
  }

  if (failed) return <main className="mx-auto max-w-[560px] p-6"><LoadState error onRetry={reload} /></main>;
  if (!me) return <main className="mx-auto max-w-[880px] p-6"><LoadState /></main>;

  if (!me.company) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-[480px] place-content-center gap-4 p-6">
        <h1 className="font-serif text-[1.6rem] font-semibold">{copy.noCompany.title}</h1>
        <p className="text-muted">{copy.noCompany.text}</p>
        <a href={whatsappLink(copy.helpMessage(me.user.name))} className="btn btn-wa" target="_blank" rel="noopener noreferrer">{copy.help}</a>
        <AsyncButton type="button" onClick={signOut} className="text-[0.88rem] text-muted underline">{copy.signOut}</AsyncButton>
      </main>
    );
  }

  const ctx: Ctx = { me, reload, writable: me.access.level === "FULL" };
  if (onboarding) return <PortalContext.Provider value={ctx}>{children}</PortalContext.Provider>;

  const company = me.company;
  const blocked = me.access.level === "BLOCKED" && !pathname.startsWith("/app/plano") && !pathname.startsWith("/app/empresa");
  const help = whatsappLink(copy.helpMessage(company.name));

  return (
    <PortalContext.Provider value={ctx}>
      <WorkspaceShell title="Área do cliente" subtitle={`${company.name} (${formatDocument(company.document)})`} homeHref="/app"
        accountName={me.user.name} accountEmail={me.user.email} onSignOut={signOut}
        navigation={portalNav.map((n) => ({ ...n, active: isActive(pathname, n.href) }))}
        banners={<AccessBanner access={me.access} />}
        footer={<a href={help} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-surface-2"><MessageCircle size={18} aria-hidden="true" />{copy.help}</a>}>
        {blocked ? <Blocked /> : children}
      </WorkspaceShell>
    </PortalContext.Provider>
  );
}

function AccessBanner({ access }: { access: PortalMe["access"] }) {
  if (access.level === "FULL" || access.level === "BLOCKED") return null;
  const text = access.level === "READ_ONLY" ? copy.access.READ_ONLY(formatDate(access.readOnlyUntil)) : copy.access.PENDING;
  return (
    <div className="border-b border-line bg-surface-2">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-[0.88rem] sm:px-6 lg:px-8">
        <p className="min-w-0 flex-1">{text}</p>
        {access.level === "READ_ONLY" && <Link href="/app/plano" className="font-semibold text-brand underline">{copy.access.renew}</Link>}
      </div>
    </div>
  );
}

function Blocked() {
  return (
    <div className="max-w-[520px] py-10">
      <h1 className="font-serif text-[1.8rem] font-semibold leading-tight">{copy.access.renew}</h1>
      <p className="mt-3 text-muted">{copy.access.BLOCKED}</p>
      <Link href="/app/plano" className="btn btn-primary mt-6">{copy.access.renew}</Link>
    </div>
  );
}
