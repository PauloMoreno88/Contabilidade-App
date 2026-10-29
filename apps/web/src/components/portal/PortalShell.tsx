"use client";

import { AsyncButton } from "@/components/common/AsyncButton";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { LogOut, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { whatsappLink, type PortalMe } from "@exactra/shared";
import { portalCopy, portalNav } from "@/config/portal";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { formatDate, formatDocument } from "@/lib/format";
import { LoadState } from "./ui";

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
 * Customer area chrome: navy sidebar on desktop, bottom tab bar on phones.
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
      <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh flex-col bg-navy px-4 py-6 text-on-navy lg:flex">
          <Link href="/app" className="flex items-center gap-2.5 px-2">
            <span className="grid size-9 place-items-center rounded-[9px] bg-white/10 p-[6px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/trace.svg" alt="" className="h-auto w-full" />
            </span>
            <span className="font-serif text-[1.25rem] font-bold tracking-[-0.02em] text-white">Exactra</span>
          </Link>
          <div className="mt-7 rounded-xl bg-white/[0.06] px-3 py-3">
            <p className="truncate text-[0.92rem] font-semibold text-white" title={company.name}>{company.name}</p>
            <p className="mt-0.5 text-[0.78rem] tabular-nums text-on-navy-faint">{formatDocument(company.document)}</p>
          </div>
          <nav aria-label="Área do cliente" className="mt-6 flex flex-col gap-0.5">
            {portalNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.93rem] text-on-navy transition-colors hover:bg-white/[0.06] hover:text-white aria-[current=page]:bg-white aria-[current=page]:font-semibold aria-[current=page]:text-navy"
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4 text-[0.88rem]">
            <a href={help} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.06] hover:text-white">
              <MessageCircle size={17} aria-hidden="true" />
              {copy.help}
            </a>
            <AsyncButton type="button" onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/[0.06] hover:text-white">
              <LogOut size={17} aria-hidden="true" />
              {copy.signOut}
            </AsyncButton>
            <p className="mt-2 truncate px-3 text-[0.76rem] text-on-navy-faint">{me.user.email}</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <MobileTopBar company={company.name} email={me.user.email} onSignOut={signOut} help={help} />
          <AccessBanner access={me.access} />
          <main className="mx-auto w-full max-w-[920px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
            {blocked ? <Blocked /> : children}
          </main>
        </div>

        {/* Phone tab bar */}
        <nav aria-label="Área do cliente" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <ul className="mx-auto grid max-w-[560px] grid-cols-4">
            {portalNav.filter((n) => n.mobile).map(({ href, short, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className="flex flex-col items-center gap-1 py-2.5 text-[0.72rem] text-faint aria-[current=page]:font-semibold aria-[current=page]:text-ink"
                >
                  <Icon size={21} aria-hidden="true" />
                  {short}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </PortalContext.Provider>
  );
}

function MobileTopBar({ company, email, help, onSignOut }: { company: string; email: string; help: string; onSignOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
      <Link href="/app" className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-navy p-[5px]" aria-label="Início">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/trace.svg" alt="" className="h-auto w-full" />
      </Link>
      <p className="min-w-0 flex-1 truncate text-[0.92rem] font-semibold">{company}</p>
      <div ref={ref} className="relative">
        <button
          type="button"
          aria-label={copy.menu}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="grid size-9 place-items-center rounded-full bg-surface-2 text-ink"
        >
          <UserRound size={18} aria-hidden="true" />
        </button>
        {open && (
          <div className="absolute right-0 top-11 w-[240px] rounded-xl border border-line bg-surface p-1.5 text-[0.9rem] shadow-[0_12px_32px_rgba(15,33,51,0.14)]">
            <p className="truncate px-3 py-2 text-[0.78rem] text-faint">{email}</p>
            <Link href="/app/empresa" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-surface-2">
              <ShieldCheck size={17} aria-hidden="true" />
              {portalNav[4].label}
            </Link>
            <a href={help} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-surface-2">
              <MessageCircle size={17} aria-hidden="true" />
              {copy.help}
            </a>
            <AsyncButton type="button" onClick={onSignOut} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-surface-2">
              <LogOut size={17} aria-hidden="true" />
              {copy.signOut}
            </AsyncButton>
          </div>
        )}
      </div>
    </header>
  );
}

function AccessBanner({ access }: { access: PortalMe["access"] }) {
  if (access.level === "FULL" || access.level === "BLOCKED") return null;
  const text = access.level === "READ_ONLY" ? copy.access.READ_ONLY(formatDate(access.readOnlyUntil)) : copy.access.PENDING;
  return (
    <div className="border-b border-line bg-surface-2">
      <div className="mx-auto flex max-w-[920px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-[0.88rem] sm:px-6 lg:px-10">
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
