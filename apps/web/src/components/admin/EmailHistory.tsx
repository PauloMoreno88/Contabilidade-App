"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Check, CheckCheck, ChevronRight, CircleAlert, Clock3, History, Mail, RefreshCw, Send, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Loading } from "@/components/common/Loading";
import { emailStatusDescriptions, emailStatusLabels, emailStatusStyles } from "@/config/email-history";
import { EmailNavigation } from "./EmailNavigation";
import { Pager } from "./Pager";
import { useLoad } from "./useLoad";

const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const statusIcons = { PENDING: Clock3, SENT: Check, DELIVERED: CheckCheck, FAILED: CircleAlert };

export function EmailHistory() {
  const [page, setPage] = useState(1);
  const history = useLoad(() => api.adminEmailHistory(page), [page]);
  return (
    <section>
      <EmailNavigation />
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">Histórico de envios</h1><p className="mt-2 max-w-2xl text-muted">As mensagens da Exactra, organizadas em um só lugar. Abra um envio para acompanhar cada destinatário.</p></div>
        <Link href="/admin/emails" className="btn btn-primary"><Send size={16} aria-hidden="true" />Novo envio</Link>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{history.data ? <><span className="font-semibold text-ink tabular-nums">{history.data.total}</span> envio(s) registrado(s)</> : "Consultando envios…"}</p>
        <button type="button" onClick={history.reload} disabled={history.loading} aria-busy={history.loading} className="btn btn-ghost px-4 py-2 text-sm"><RefreshCw size={15} aria-hidden="true" />Atualizar histórico</button>
      </div>
      {history.error && <p role="alert" className="mt-4 rounded-xl border border-brand/20 bg-brand-tint p-4 text-sm">Não foi possível carregar o histórico. Tente atualizar novamente.</p>}
      {!history.data && !history.error && <Loading />}
      {history.loading && history.data && <Loading compact label="Atualizando histórico…" />}
      {history.data?.items.length === 0 && <div className="mt-5 rounded-2xl border border-line bg-surface px-6 py-16 text-center"><History size={28} className="mx-auto mb-4 text-faint" aria-hidden="true" /><h2 className="text-lg font-semibold">Suas mensagens ficam aqui</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted">Após o primeiro envio, consulte o conteúdo e acompanhe a entrega para cada cliente.</p><Link href="/admin/emails" className="btn btn-ghost mt-6">Criar primeiro envio</Link></div>}
      {!!history.data?.items.length && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
          <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_160px_100px_24px] gap-5 border-b border-line bg-surface-2 px-6 py-3 text-xs font-medium text-muted md:grid"><span>Mensagem e responsável</span><span>Data do envio</span><span>Clientes</span><span /></div>
          <ul className="divide-y divide-line">
            {history.data.items.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/emails/envio?id=${encodeURIComponent(c.id)}`} className="group grid items-center gap-x-5 gap-y-3 px-5 py-5 transition-colors hover:bg-surface-2/60 md:grid-cols-[minmax(0,1fr)_160px_100px_24px] md:px-6">
                  <div className="flex min-w-0 items-center gap-4"><span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-navy-3 sm:flex"><Mail size={18} aria-hidden="true" /></span><span className="min-w-0"><span className="block break-words font-semibold group-hover:text-brand">{c.subject}</span><span className="mt-1 block break-words text-xs text-muted">Por {c.createdBy}</span></span></div>
                  <time dateTime={c.createdAt} className="text-sm text-muted tabular-nums">{dateTime(c.createdAt)}</time>
                  <span className="flex items-center justify-between md:contents"><span className="inline-flex items-center gap-2 text-sm text-muted"><Users size={15} aria-hidden="true" /><span className="tabular-nums">{c.recipientCount}<span className="md:sr-only"> cliente(s)</span></span></span><ChevronRight size={18} className="text-faint transition-colors group-hover:text-brand" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {history.data && <Pager {...history.data} onPage={setPage} />}
    </section>
  );
}

export function EmailCampaignDetail() {
  const id = useSearchParams().get("id") ?? "";
  const campaign = useLoad(() => api.adminEmailCampaign(id), [id]);
  const c = campaign.data;
  return (
    <section>
      <EmailNavigation />
      <Link href="/admin/emails/historico" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden="true" />Voltar ao histórico</Link>
      {campaign.error && <p role="alert" className="mt-5 rounded-xl border border-brand/20 bg-brand-tint p-4 text-sm">Não foi possível carregar este envio. <button type="button" onClick={campaign.reload} className="font-semibold underline">Tentar novamente</button></p>}
      {!c && !campaign.error && <Loading />}
      {c && (
        <>
          <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:justify-between">
            <div className="min-w-0 flex-1"><h1 className="break-words text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">{c.subject}</h1><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"><time dateTime={c.createdAt} className="inline-flex items-center gap-2"><CalendarDays size={15} aria-hidden="true" />{dateTime(c.createdAt)}</time><span className="break-all">Criado por {c.createdBy}</span></div></div>
            <button type="button" onClick={campaign.reload} disabled={campaign.loading} aria-busy={campaign.loading} className="btn btn-ghost px-4 py-2.5 text-sm"><RefreshCw size={15} aria-hidden="true" />Atualizar status</button>
          </div>
          {campaign.loading && <Loading compact label="Atualizando status…" />}
          <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="order-2 min-w-0 overflow-hidden rounded-2xl border border-line bg-surface xl:order-1">
              <div className="flex items-center gap-3 border-b border-line px-5 py-5 sm:px-6"><Mail size={18} className="text-navy-3" aria-hidden="true" /><h2 className="font-semibold">Mensagem</h2></div>
              <div className="p-5 sm:p-6"><p className="whitespace-pre-wrap break-words text-[0.95rem] leading-7 [overflow-wrap:anywhere]">{c.message}</p></div>
              <p className="border-t border-line bg-surface-2/50 px-5 py-4 text-xs leading-relaxed text-muted sm:px-6">Conteúdo registrado no momento do envio. Cada destinatário recebe sua própria cópia.</p>
            </div>
            <div className="order-1 min-w-0 xl:order-2">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Destinatários</h2><span className="text-sm text-muted">{c.recipientCount} cliente(s)</span></div>
              <ul className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface sm:grid-cols-4" aria-label="Resumo dos status">
                {Object.entries(emailStatusLabels).map(([status, label]) => {
                  const Icon = statusIcons[status as keyof typeof statusIcons];
                  return <li key={status} className="border-line px-4 py-4 not-last:border-r"><span className="flex items-center gap-1.5 text-xs text-muted"><Icon size={14} aria-hidden="true" />{label}</span><span className="mt-1 block text-xl font-semibold tabular-nums">{c.recipients.filter((r) => r.status === status).length}</span></li>;
                })}
              </ul>
              <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
                <table className="w-full table-fixed text-left text-sm sm:table-auto">
                  <caption className="sr-only">Status de envio por cliente</caption>
                  <thead className="border-b border-line bg-surface-2 text-xs text-muted"><tr><th scope="col" className="px-4 py-3 font-medium">Cliente</th><th scope="col" className="w-28 px-4 py-3 font-medium sm:w-auto">Status</th><th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Atualizado em</th></tr></thead>
                  <tbody>
                    {c.recipients.map((r) => {
                      const Icon = statusIcons[r.status];
                      return (
                        <tr key={r.id} className="border-b border-line last:border-0">
                          <td className="min-w-0 break-words px-4 py-4 [overflow-wrap:anywhere]"><span className="font-medium">{r.name}</span><span className="mt-0.5 block text-xs text-muted">{r.email}</span><time dateTime={r.updatedAt} className="mt-1 block text-xs text-faint sm:hidden">{dateTime(r.updatedAt)}</time></td>
                          <td className="px-4 py-4"><span title={emailStatusDescriptions[r.status]} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${emailStatusStyles[r.status]}`}><Icon size={13} aria-hidden="true" />{emailStatusLabels[r.status]}</span></td>
                          <td className="hidden px-4 py-4 text-xs text-muted tabular-nums sm:table-cell"><time dateTime={r.updatedAt}>{dateTime(r.updatedAt)}</time></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <details className="mt-4 text-sm text-muted"><summary className="w-fit cursor-pointer py-2 font-medium hover:text-ink">O que cada status significa?</summary><dl className="mt-2 space-y-3 rounded-xl bg-surface-2 p-4">{Object.entries(emailStatusLabels).map(([status, label]) => <div key={status}><dt className="font-semibold text-ink">{label}</dt><dd className="mt-0.5 text-xs leading-relaxed">{emailStatusDescriptions[status as keyof typeof emailStatusDescriptions]}</dd></div>)}</dl></details>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
