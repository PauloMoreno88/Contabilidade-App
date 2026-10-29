"use client";

import { useRef, useState, type FormEvent } from "react";
import { bulkEmailSchema } from "@exactra/shared";
import { api } from "@/lib/api";
import { useLoad } from "./useLoad";

export function BulkEmail() {
  const rows = useLoad(() => api.adminEmailRecipients(), []);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [notice, setNotice] = useState("");
  const selected = rows.data?.filter((c) => !excluded.has(c.id)) ?? [];

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
      setExcluded(new Set(rows.data!.filter((c) => !result.failedCustomerIds.includes(c.id)).map((c) => c.id)));
      setNotice(`${result.sent} e-mail(s) enviado(s). ${result.failedCustomerIds.length} falha(s). Apenas os clientes com falha continuam selecionados.`);
    } catch {
      setNotice("Não foi possível confirmar o envio. Confira os envios no provedor antes de tentar novamente para evitar duplicados.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Enviar e-mail aos clientes</h1>
      <p className="mt-2 text-muted">Escreva uma mensagem e escolha quem deve receber. Cada cliente recebe um e-mail individual.</p>
      {rows.error && <div role="alert" className="mt-6">Não foi possível carregar os clientes. <button type="button" onClick={rows.reload} className="underline">Tentar novamente</button></div>}
      {!rows.data && !rows.error && <p role="status" className="mt-6 text-muted">Carregando clientes…</p>}
      {rows.data?.length === 0 && <p className="mt-6 text-muted">Nenhum cliente cadastrado.</p>}
      {!!rows.data?.length && (
        <form onSubmit={submit} className="mt-6 space-y-6">
          <fieldset disabled={busy} className="space-y-3">
            <legend className="mb-3 font-medium">Destinatários ({selected.length} de {rows.data.length})</legend>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={selected.length === rows.data.length} onChange={(e) => setExcluded(e.target.checked ? new Set() : new Set(rows.data!.map((c) => c.id)))} />
              Selecionar todos os clientes
            </label>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-line bg-surface divide-y divide-line">
              {rows.data.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <input type="checkbox" checked={!excluded.has(c.id)} onChange={(e) => setExcluded((current) => { const next = new Set(current); if (e.target.checked) next.delete(c.id); else next.add(c.id); return next; })} />
                  <span className="min-w-0 break-words">{c.name}<span className="block text-sm text-muted">{c.email}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block font-medium">Assunto
            <input className="field-input mt-2" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} disabled={busy} />
          </label>
          <label className="block font-medium">Mensagem
            <textarea className="field-input mt-2 min-h-56" value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={20000} disabled={busy} />
          </label>
          <p className="text-sm text-muted">A mensagem será enviada como texto, preservando as quebras de linha.</p>
          <button type="submit" disabled={busy || !selected.length} className="rounded-lg bg-brand px-5 py-3 font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Enviando… aguarde nesta página" : `Enviar para ${selected.length} cliente(s)`}
          </button>
          {notice && <p role="status" className="text-sm">{notice}</p>}
        </form>
      )}
    </section>
  );
}
