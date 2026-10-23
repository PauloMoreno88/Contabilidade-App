"use client";

import { RotateCw } from "lucide-react";
import { portalCopy } from "@/config/portal";

/** Small building blocks shared by the customer area pages. */

export function PageHeader({ title, lede, children }: { title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-serif text-[clamp(1.7rem,4vw,2.15rem)] font-semibold leading-[1.1] tracking-[-0.015em]">{title}</h1>
        {lede && <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-muted">{lede}</p>}
      </div>
      {children}
    </header>
  );
}

/** Loading and error states for a useLoad() result. */
export function LoadState({ error, onRetry }: { error?: boolean; onRetry?: () => void }) {
  if (!error) {
    return (
      <div aria-busy="true" className="space-y-3">
        <span className="sr-only">{portalCopy.loading}</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }
  return (
    <div role="alert" className="rounded-2xl border border-line bg-surface p-5 text-[0.92rem] text-muted">
      <p>{portalCopy.loadError}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-ghost mt-3 px-4 py-2 text-[0.88rem]">
          <RotateCw size={15} aria-hidden="true" />
          {portalCopy.retry}
        </button>
      )}
    </div>
  );
}

/** Plain white panel with a hairline; the default container of the area. */
export function Panel({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-[0.98rem] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Morning / afternoon / evening in São Paulo. */
export function dayPeriod(now = new Date()): "dia" | "tarde" | "noite" {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(now));
  return h < 12 ? "dia" : h < 18 ? "tarde" : "noite";
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
