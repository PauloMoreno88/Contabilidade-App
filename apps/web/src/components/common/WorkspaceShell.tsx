"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronsLeft, ChevronsRight, LogOut, Menu, UserRound, X, type LucideIcon } from "lucide-react";
import { Brand } from "@/components/landing/Brand";
import { AsyncButton } from "./AsyncButton";

export type WorkspaceNavItem = { href: string; label: string; icon: LucideIcon; active: boolean };

export function WorkspaceShell({ title, subtitle, homeHref, navigation, accountName, accountEmail, onSignOut, footer, banners, children }: {
  title: string; subtitle?: string; homeHref: string; navigation: WorkspaceNavItem[];
  accountName: string; accountEmail: string; onSignOut: () => Promise<void>;
  footer?: ReactNode; banners?: ReactNode; children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeMenu = () => dialog.current?.close();

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const sidebar = (compact: boolean, mobile = false) => (
    <>
      <div className={`flex h-20 shrink-0 items-center gap-2 border-b border-line ${compact ? "justify-center px-2" : "justify-between px-5"}`}>
        {!compact && <Brand href={homeHref} />}
        <button type="button" onClick={mobile ? closeMenu : () => setCollapsed((v) => !v)} aria-label={mobile ? "Fechar menu" : compact ? "Expandir menu" : "Recolher menu"} aria-expanded={mobile ? undefined : !compact} className="grid size-8 shrink-0 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-ink">
          {mobile ? <X size={18} aria-hidden="true" /> : compact ? <ChevronsRight size={18} aria-hidden="true" /> : <ChevronsLeft size={18} aria-hidden="true" />}
        </button>
      </div>
      {!compact && <div className="px-5 pt-5 pb-3"><p className="text-sm font-semibold">{title}</p>{subtitle && <p className="mt-1 truncate text-xs text-muted" title={subtitle}>{subtitle}</p>}</div>}
      <nav aria-label={title} className={`min-h-0 flex-1 space-y-1 overflow-y-auto p-3 ${compact ? "pt-5" : ""}`}>
        {navigation.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} title={compact ? label : undefined} onClick={mobile ? closeMenu : undefined} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-brand-tint aria-[current=page]:font-semibold aria-[current=page]:text-brand-dark ${compact ? "justify-center" : ""}`}>
            <Icon size={18} className="shrink-0" aria-hidden="true" /><span className={compact ? "sr-only" : ""}>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="mx-3 shrink-0 space-y-1 border-t border-line py-3">
        {!compact && footer}
        <div className={`flex items-center gap-3 px-3 py-3 ${compact ? "justify-center" : ""}`} title={compact ? accountEmail : undefined}>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-navy-3"><UserRound size={16} aria-hidden="true" /></span>
          {!compact && <div className="min-w-0"><p className="truncate text-xs font-semibold">{accountName}</p><p className="mt-0.5 truncate text-xs text-faint" title={accountEmail}>{accountEmail}</p></div>}
        </div>
        <AsyncButton type="button" onClick={onSignOut} title={compact ? "Sair" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-dark hover:bg-brand-tint ${compact ? "justify-center" : ""}`}><LogOut size={18} aria-hidden="true" /><span className={compact ? "sr-only" : ""}>Sair</span></AsyncButton>
      </div>
    </>
  );

  return (
    <div className="workspace flex min-h-dvh">
      <a href="#workspace-content" className="sr-only z-50 rounded-lg bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Ir para o conteúdo</a>
      <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface lg:flex ${collapsed ? "w-20" : "w-64"}`}>{sidebar(collapsed)}</aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <button type="button" aria-label="Abrir menu" aria-expanded={mobileOpen} aria-controls="workspace-menu" onClick={() => { dialog.current?.showModal(); setMobileOpen(true); }} className="grid size-10 shrink-0 place-items-center rounded-lg border border-line hover:bg-surface-2"><Menu size={20} aria-hidden="true" /></button>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{title}</p><p className="truncate text-xs text-muted">{navigation.find((n) => n.active)?.label ?? subtitle}</p></div>
        </header>
        {banners}
        <main id="workspace-content" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
      </div>
      <dialog id="workspace-menu" ref={dialog} aria-label={title} onClose={() => setMobileOpen(false)} onClick={(e) => { if (e.target === e.currentTarget) closeMenu(); }} className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-3rem)] border-0 bg-surface p-0 text-ink backdrop:bg-navy/40">
        <div className="flex h-full flex-col">{sidebar(false, true)}</div>
      </dialog>
    </div>
  );
}
