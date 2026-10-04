"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminCopy } from "@/config/admin";
import { authClient } from "@/lib/auth";
import { AuthCard, Field, FormError } from "./AuthCard";

const MIN_PASSWORD = 8;

export function ForgotPasswordForm() {
  const copy = adminCopy.forgot;
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    // Always show the same message, so the form doesn't reveal which e-mails exist.
    await authClient.requestPasswordReset({
      email: String(new FormData(e.currentTarget).get("email")),
      redirectTo: `${window.location.origin}/admin/redefinir-senha`,
    });
    setSent(true);
  }

  return (
    <AuthCard title={copy.title}>
      {sent ? (
        <p role="status" className="text-[0.9rem] text-muted">{copy.sent}</p>
      ) : (
        <form onSubmit={submit}>
          <p className="mb-5 text-[0.9rem] text-muted">{copy.text}</p>
          <Field id="email" label={adminCopy.login.email} type="email" autoComplete="username" required />
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>{copy.submit}</button>
        </form>
      )}
      <Link href="/admin/login" className="mt-4 block text-center text-[0.86rem] text-muted underline hover:text-ink">{copy.back}</Link>
    </AuthCard>
  );
}

export function ResetPasswordForm() {
  const copy = adminCopy.reset;
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState<string | undefined>(params.get("error") || !token ? copy.invalid : undefined);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < MIN_PASSWORD) return setError(copy.tooShort);
    if (password !== f.get("confirm")) return setError(copy.mismatch);
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token ?? "" });
    setBusy(false);
    if (error) return setError(copy.invalid);
    setDone(true);
  }

  if (done) {
    return (
      <AuthCard title={copy.title}>
        <p role="status" className="mb-5 text-[0.9rem] text-muted">{copy.done}</p>
        <Link href="/admin/login" className="btn btn-primary w-full">{copy.goLogin}</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={copy.title}>
      {token && !params.get("error") ? (
        <form onSubmit={submit}>
          <Field id="password" label={copy.password} type="password" autoComplete="new-password" minLength={MIN_PASSWORD} hint={copy.hint} required />
          <Field id="confirm" label={copy.confirm} type="password" autoComplete="new-password" required />
          <FormError>{error}</FormError>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>{copy.submit}</button>
        </form>
      ) : (
        <>
          <FormError>{error}</FormError>
          <Link href="/admin/esqueci-senha" className="btn btn-ghost w-full">{adminCopy.forgot.submit}</Link>
        </>
      )}
    </AuthCard>
  );
}
