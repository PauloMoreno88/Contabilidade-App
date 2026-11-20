"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Send, ShieldCheck, Users } from "lucide-react";
import { bulkEmailSchema } from "@exactra/shared";
import { api } from "@/lib/api";
import { useLoad } from "./useLoad";
import { Loading } from "@/components/common/Loading";
import { EmailNavigation } from "./EmailNavigation";

export function BulkEmail() {
  const router = useRouter();
  const rows = useLoad(() => api.adminEmailRecipients(), []);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const selectAll = useRef<HTMLInputElement>(null);
  const selected = rows.data?.filter((c) => !excluded.has(c.id)) ?? [];
  const visible = rows.data?.filter((c) => `${c.name} ${c.email}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))) ?? [];

  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selected.length > 0 && selected.length < (rows.data?.length ?? 0);
  }, [selected.length, rows.data]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending.current) return;
    const input = bulkEmailSchema.safeParse({ subject, message, customerIds: selected.map((c) => c.id) });
    if (!input.success) return setNotice("Preencha o assunto e a mensagem e selecione entre 1 e 1.000 clientes.");
    sending.current = true;
    setBusy(true);
    setNotice("");
    try {
      const result = await api.adminSendEmail(input.data);
      router.push(`/admin/emails/envio?id=${encodeURIComponent(result.campaignId)}`);
    } catch {
      setNotice("Não foi possível confirmar o envio. Consulte o histórico antes de tentar novamente para evitar duplicados.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <section>
      <EmailNavigation />
      <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">Enviar e-mail aos clientes</h1>
      <p className="mt-2 max-w-2xl text-muted">Um aviso, uma orientação ou uma novidade. Escreva sua mensagem e escolha os clientes que devem receber.</p>
      {rows.error && <div role="alert" className="mt-6 rounded-xl border border-brand/20 bg-brand-tint p-4 text-sm">Não foi possível carregar os clientes. <button type="button" onClick={rows.reload} className="font-semibold underline">Tentar novamente</button></div>}
      {!rows.data && !rows.error && <Loading label="Carregando clientes…" />}
      {rows.data?.length === 0 && <div className="mt-8 rounded-2xl border border-line bg-surface px-6 py-12 text-center"><Users className="mx-auto mb-3 text-faint" aria-hidden="true" /><h2 className="font-semibold">Nenhum cliente cadastrado</h2><p className="mt-2 text-sm text-muted">Cadastre um cliente para começar a enviar e-mails.</p><Link href="/admin/clientes" className="btn btn-ghost mt-5">Ver clientes</Link></div>}
      {!!rows.data?.length && (
        <form onSubmit={submit} className="mt-8">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 rounded-2xl border border-line bg-surface">
              <div className="border-b border-line px-5 py-5 sm:px-7"><h2 className="font-semibold">Sua mensagem</h2><p className="mt-1 text-sm text-muted">O mesmo conteúdo será enviado a cada cliente selecionado.</p></div>
              <div className="space-y-6 p-5 sm:p-7">
                <label className="block text-sm font-semibold">Assunto
                  <input className="field-input mt-2 bg-surface" placeholder="Ex.: Documentos para o fechamento do mês" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} disabled={busy} />
                </label>
                <label className="block text-sm font-semibold">Mensagem
                  <textarea className="field-input mt-2 min-h-72 resize-y bg-surface leading-relaxed lg:min-h-96" placeholder="Olá! Escreva aqui a orientação para seus clientes…" value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={20000} disabled={busy} />
                </label>
                <p className="text-xs leading-relaxed text-muted">Texto simples, com as quebras de linha que você escrever. O assunto e a mensagem ficam salvos no histórico.</p>
              </div>
            </div>
            <fieldset disabled={busy} className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface">
              <legend className="sr-only">Destinatários</legend>
              <div className="bg-navy px-5 py-5 text-white"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><Users size={18} aria-hidden="true" />Destinatários</h2><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs tabular-nums">{selected.length} de {rows.data.length}</span></div><p className="mt-2 text-sm text-on-navy">Todos começam selecionados. Desmarque quem não deve receber.</p></div>
              <div className="p-4">
                <label className="relative block"><span className="sr-only">Buscar cliente</span><Search size={16} className="pointer-events-none absolute top-3.5 left-3 text-faint" aria-hidden="true" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} placeholder="Buscar nome ou e-mail" className="field-input bg-surface py-2.5 pl-9" /></label>
                <p className="mt-2 text-xs text-faint">A busca não altera os clientes selecionados.</p>
                <label className="mt-4 flex min-h-9 cursor-pointer items-center gap-3 text-sm font-medium"><input ref={selectAll} type="checkbox" className="size-4 accent-navy" checked={selected.length === rows.data.length} onChange={(e) => setExcluded(e.target.checked ? new Set() : new Set(rows.data!.map((c) => c.id)))} />Selecionar todos os clientes</label>
              </div>
              <div className="max-h-96 divide-y divide-line overflow-y-auto border-t border-line lg:max-h-[420px]">
                {visible.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2 has-checked:bg-surface-2/50">
                    <input type="checkbox" className="size-4 shrink-0 accent-navy" checked={!excluded.has(c.id)} onChange={(e) => setExcluded((current) => { const next = new Set(current); if (e.target.checked) next.delete(c.id); else next.add(c.id); return next; })} />
                    <span className="min-w-0 break-words text-sm font-medium">{c.name}<span className="mt-0.5 block text-xs font-normal text-muted">{c.email}</span></span>
                  </label>
                ))}
                {!visible.length && <p className="p-5 text-sm text-muted">Nenhum cliente encontrado. Tente outro nome ou e-mail.</p>}
              </div>
            </fieldset>
          </div>
          <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="flex max-w-md items-start gap-3 text-sm text-muted"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />Cada cliente recebe um e-mail individual. Os endereços dos outros destinatários não aparecem.</p>
            <button type="submit" disabled={busy || !selected.length} aria-busy={busy} className="btn btn-primary w-full sm:w-auto"><Send size={16} aria-hidden="true" />{busy ? "Enviando… aguarde nesta página" : `Enviar para ${selected.length} cliente(s)`}</button>
          </div>
          {notice && <p role="alert" className="mt-4 rounded-xl border border-brand/20 bg-brand-tint p-4 text-sm">{notice}</p>}
        </form>
      )}
    </section>
  );
}
