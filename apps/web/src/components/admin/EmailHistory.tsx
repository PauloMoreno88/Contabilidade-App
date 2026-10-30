"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Loading } from "@/components/common/Loading";
import { emailStatusLabels } from "@/config/email-history";
import { Pager } from "./Pager";
import { useLoad } from "./useLoad";

const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR");

export function EmailHistory() {
  const [page, setPage] = useState(1);
  const history = useLoad(() => api.adminEmailHistory(page), [page]);
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Histórico de envios</h1>
        <Link href="/admin/emails" className="btn btn-primary">Novo envio</Link>
      </div>
      <button type="button" onClick={history.reload} disabled={history.loading} aria-busy={history.loading} className="mt-5 underline">Atualizar histórico</button>
      {history.error && <p role="alert" className="mt-4 text-brand">Não foi possível carregar o histórico. Tente atualizar novamente.</p>}
      {!history.data && !history.error && <Loading />}
      {history.loading && history.data && <Loading compact label="Atualizando histórico…" />}
      {history.data?.items.length === 0 && <p className="mt-6 text-muted">Nenhum envio registrado.</p>}
      {!!history.data?.items.length && (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
          {history.data.items.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/emails/envio?id=${encodeURIComponent(c.id)}`} className="block break-words px-4 py-4 hover:bg-surface-2">
                <span className="font-medium underline">{c.subject}</span>
                <span className="mt-1 block text-sm text-muted">{dateTime(c.createdAt)} · {c.recipientCount} cliente(s)</span>
                <span className="block text-sm text-muted">Enviado por {c.createdBy}</span>
              </Link>
            </li>
          ))}
        </ul>
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
      <Link href="/admin/emails/historico" className="underline">Voltar ao histórico</Link>
      {campaign.error && <p role="alert" className="mt-4 text-brand">Não foi possível carregar este envio. <button type="button" onClick={campaign.reload} className="underline">Tentar novamente</button></p>}
      {!c && !campaign.error && <Loading />}
      {c && (
        <>
          <h1 className="mt-6 break-words text-2xl font-semibold">{c.subject}</h1>
          <p className="mt-2 break-words text-sm text-muted">{dateTime(c.createdAt)} · Criado por {c.createdBy}</p>
          <h2 className="mt-6 font-semibold">Mensagem</h2>
          <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words">{c.message}</p>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Destinatários ({c.recipientCount})</h2>
            <button type="button" onClick={campaign.reload} disabled={campaign.loading} aria-busy={campaign.loading} className="underline">Atualizar status</button>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted">Pendente: aguardando envio ou nova tentativa de entrega. Enviado: aceito pelo provedor. Entregue: confirmado pelo servidor do destinatário, sem confirmação de leitura. Falhou: erro ou rejeição.</p>
          {campaign.loading && <Loading compact label="Atualizando status…" />}
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Resumo dos status">
            {Object.entries(emailStatusLabels).map(([status, label]) => <li key={status}>{label}: {c.recipients.filter((r) => r.status === status).length}</li>)}
          </ul>
          <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Status de envio por cliente</caption>
              <thead className="border-b border-line"><tr><th scope="col" className="p-4">Cliente</th><th scope="col" className="p-4">Status</th><th scope="col" className="p-4">Última atualização</th></tr></thead>
              <tbody>
                {c.recipients.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="max-w-xs break-words p-4">{r.name}<span className="block text-muted">{r.email}</span></td>
                    <td className={`p-4 font-medium ${r.status === "FAILED" ? "text-brand" : r.status === "DELIVERED" ? "text-ok" : ""}`}>{emailStatusLabels[r.status]}</td>
                    <td className="whitespace-nowrap p-4 tabular-nums">{dateTime(r.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
