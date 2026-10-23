"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { whatsappLink, type InviteInfo } from "@exactra/shared";
import { authCopy } from "@/config/auth";
import { useLoad } from "@/components/admin/useLoad";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { AuthCard, Field, FormError } from "./AuthCard";

const MIN_PASSWORD = 8;
const copy = authCopy.activate;

/** Link from the invite e-mail (/entrar/ativar?token=): first password, then straight into the customer area. */
export function ActivateForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const invite = useLoad<InviteInfo>(() => api.inviteInfo(token), [token]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < MIN_PASSWORD) return setError(authCopy.reset.tooShort);
    if (password !== f.get("confirm")) return setError(authCopy.reset.mismatch);
    setBusy(true);
    try {
      await api.activateAccount({ token, password });
    } catch {
      setBusy(false);
      return setError(copy.invalid);
    }
    const { error } = await authClient.signIn.email({ email: invite.data!.email, password });
    if (error) return router.replace("/entrar");
    router.replace("/app");
  }

  if (!invite.data && !invite.error) return <AuthCard title={copy.title}><p className="text-muted">{copy.checking}</p></AuthCard>;

  if (invite.error || !invite.data) {
    return (
      <AuthCard title={copy.invalid}>
        <p className="mb-5 text-[0.9rem] text-muted">{copy.invalidHelp}</p>
        <a href={whatsappLink(authCopy.login.helpMessage)} target="_blank" rel="noopener noreferrer" className="btn btn-wa w-full">{authCopy.login.helpCta}</a>
        <Link href="/entrar" className="mt-4 block text-center text-[0.86rem] text-muted underline hover:text-ink">{authCopy.forgot.back}</Link>
      </AuthCard>
    );
  }

  const i = invite.data;
  return (
    <AuthCard title={copy.title} lede={copy.lede(i.companyName)}>
      <form onSubmit={submit}>
        <Field id="email" label={copy.email} type="email" value={i.email} readOnly autoComplete="username" />
        <Field id="password" label={authCopy.reset.password} type="password" autoComplete="new-password" minLength={MIN_PASSWORD} hint={authCopy.reset.hint} required autoFocus />
        <Field id="confirm" label={authCopy.reset.confirm} type="password" autoComplete="new-password" required />
        <FormError>{error}</FormError>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{copy.submit}</button>
      </form>
    </AuthCard>
  );
}
