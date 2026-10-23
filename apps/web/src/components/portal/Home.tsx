"use client";

import Link from "next/link";
import { AlertCircle, CalendarClock, Check, Download, FileText, ReceiptText, RefreshCw, Sparkles } from "lucide-react";
import { competenceLabel, daysUntil, GUIDE_TYPE_LABELS, type PortalHome, type PortalTask } from "@exactra/shared";
import { portalCopy } from "@/config/portal";
import { useLoad } from "@/components/admin/useLoad";
import { api } from "@/lib/api";
import { formatBRLExact, formatDate, formatDay, formatDayShort } from "@/lib/format";
import { usePortal } from "./PortalShell";
import { dayPeriod, firstName, LoadState } from "./ui";

const copy = portalCopy.home;

export const guideName = (g: { label: string | null; type: keyof typeof GUIDE_TYPE_LABELS }) => g.label || GUIDE_TYPE_LABELS[g.type];

/** "Início": what to do now, most urgent first, and the month at a glance. */
export function Home() {
  const { me } = usePortal();
  const home = useLoad(() => api.home(), []);
  const name = firstName(me.user.name);

  return (
    <>
      <header className="mb-8">
        <h1 className="font-serif text-[clamp(1.9rem,5vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
          {copy.greeting(dayPeriod(), name)}
        </h1>
        {home.data && (
          <p className="mt-2 text-[1.05rem] text-muted">
            {home.data.tasks.length ? copy.pending(home.data.tasks.length) : copy.allClear}
          </p>
        )}
      </header>

      {!home.data ? (
        <LoadState error={home.error} onRetry={home.reload} />
      ) : (
        <>
          <Tasks tasks={home.data.tasks} />
          <Glance home={home.data} />
        </>
      )}
    </>
  );
}

function Tasks({ tasks }: { tasks: PortalTask[] }) {
  if (!tasks.length) {
    return (
      <div className="mb-8 flex items-start gap-4 rounded-2xl border border-ok/25 bg-ok-tint px-5 py-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ok text-white">
          <Check size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold">{copy.allClear}</p>
          <p className="mt-0.5 text-[0.92rem] text-muted">{copy.allClearText}</p>
        </div>
      </div>
    );
  }
  return (
    <section aria-labelledby="tasks-title" className="mb-9">
      <h2 id="tasks-title" className="sr-only">{copy.tasksTitle}</h2>
      <ol className="overflow-hidden rounded-2xl border border-line bg-surface">
        {tasks.map((t, i) => (
          <li key={i} className="border-b border-line last:border-b-0">
            <TaskRow task={t} />
          </li>
        ))}
      </ol>
    </section>
  );
}

type Row = { icon: React.ReactNode; title: string; text?: string; href: string; cta: string; urgent: boolean; aside?: React.ReactNode };

function describe(t: PortalTask): Row {
  const k = copy.task;
  switch (t.kind) {
    case "onboarding":
      return { icon: <Sparkles size={19} />, title: k.onboarding.title, text: k.onboarding.text, href: "/app/boas-vindas", cta: k.onboarding.cta, urgent: false };
    case "guide": {
      const days = daysUntil(t.dueDate);
      const when = t.status === "OVERDUE" ? k.guide.overdue : days === 0 ? k.guide.today : k.guide.due(days);
      const urgent = t.status === "OVERDUE" || days <= 1;
      return {
        icon: <ReceiptText size={19} />,
        title: guideName(t),
        text: `${when}, ${formatDay(t.dueDate)}`,
        href: `/app/guias?id=${t.guideId}`,
        cta: k.guide.cta,
        urgent,
        aside: <span className="font-serif text-[1.15rem] font-semibold tabular-nums">{formatBRLExact(t.amountCents)}</span>,
      };
    }
    case "rejected":
      return {
        icon: <AlertCircle size={19} />,
        title: k.rejected.title(t.title),
        text: portalCopy.documents.status.REJECTED,
        href: `/app/documentos?competencia=${t.competence}#${t.requestId}`,
        cta: k.rejected.cta,
        urgent: true,
      };
    case "documents": {
      const days = daysUntil(t.dueDate);
      return {
        icon: <FileText size={19} />,
        title: k.documents.title(competenceLabel(t.competence)),
        text: k.documents.text(t.pending, formatDay(t.dueDate)),
        href: `/app/documentos?competencia=${t.competence}`,
        cta: k.documents.cta,
        urgent: days <= 1,
      };
    }
    case "renew":
      return { icon: <RefreshCw size={19} />, title: k.renew.title, text: k.renew.text(formatDate(t.endsAt)), href: "/app/plano", cta: k.renew.cta, urgent: false };
    case "retention":
      return {
        icon: <Download size={19} />,
        title: k.retention.title(competenceLabel(t.competence)),
        text: k.retention.text(formatDay(t.deletesOn)),
        href: `/app/documentos?competencia=${t.competence}`,
        cta: k.retention.cta,
        urgent: false,
      };
  }
}

function TaskRow({ task }: { task: PortalTask }) {
  const r = describe(task);
  return (
    <Link href={r.href} className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:px-5">
      <span
        aria-hidden="true"
        className={`grid size-10 shrink-0 place-items-center rounded-full ${r.urgent ? "bg-brand-tint text-brand" : "bg-surface-2 text-navy-3"}`}
      >
        {r.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{r.title}</span>
        {r.text && <span className={`mt-0.5 block text-[0.88rem] ${r.urgent ? "font-medium text-brand" : "text-muted"}`}>{r.text}</span>}
      </span>
      {r.aside && <span className="hidden sm:block">{r.aside}</span>}
      <span className={`shrink-0 rounded-full px-3.5 py-1.5 text-[0.84rem] font-semibold ${r.urgent ? "bg-brand text-white group-hover:bg-brand-dark" : "border border-line text-ink group-hover:border-muted"}`}>
        {r.cta}
      </span>
    </Link>
  );
}

function Glance({ home }: { home: PortalHome }) {
  const d = home.documents;
  const g = home.guides;
  const month = competenceLabel(d.competence);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold">{copy.documentsTitle(month)}</h2>
          <span className="flex items-center gap-1.5 text-[0.82rem] text-faint">
            <CalendarClock size={15} aria-hidden="true" />
            {copy.documentsDue(formatDayShort(d.dueDate))}
          </span>
        </div>
        <p className="mt-4 font-serif text-[1.6rem] font-semibold tabular-nums leading-none">{copy.documentsSummary(d.sent, d.total)}</p>
        {d.total > 0 && (
          // One segment per required document: the month fills up as files arrive.
          <div className="mt-4 flex gap-1" aria-hidden="true">
            {Array.from({ length: d.total }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < d.sent ? "bg-ok" : "bg-surface-3"}`} />
            ))}
          </div>
        )}
        <Link href="/app/documentos" className="mt-5 inline-block text-[0.9rem] font-semibold underline underline-offset-4">{copy.documentsCta}</Link>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-semibold">{copy.guidesTitle}</h2>
        {g.open ? (
          <>
            <p className="mt-4 font-serif text-[1.6rem] font-semibold tabular-nums leading-none">{formatBRLExact(g.openAmountCents)}</p>
            <p className="mt-2 text-[0.88rem] text-muted">
              {copy.guidesSummary(g.open)}
              {g.nextDueDate && <>. {copy.guidesNext(formatDay(g.nextDueDate))}</>}
            </p>
          </>
        ) : (
          <p className="mt-4 text-[0.92rem] text-muted">{copy.guidesNone}</p>
        )}
        <Link href="/app/guias" className="mt-5 inline-block text-[0.9rem] font-semibold underline underline-offset-4">{copy.guidesCta}</Link>
      </section>
    </div>
  );
}
