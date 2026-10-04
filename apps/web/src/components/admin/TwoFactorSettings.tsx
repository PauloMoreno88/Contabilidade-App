"use client";

import { useState, type FormEvent } from "react";
import QRCode from "react-qr-code";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { adminCopy } from "@/config/admin";
import { authClient } from "@/lib/auth";
import { Field, FormError } from "./AuthCard";
import { useAdminSession } from "./AdminShell";

const copy = adminCopy.security;

/** Better Auth twoFactor enrollment: enable (password) → scan TOTP → save backup codes → verify. */
export function TwoFactorSettings() {
  const { user, reload } = useAdminSession();
  const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const password = (e: FormEvent<HTMLFormElement>) => String(new FormData(e.currentTarget).get("password"));

  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await authClient.twoFactor.enable({ password: password(e) });
    setBusy(false);
    if (error || !data || !("totpURI" in data)) return setError(copy.wrongPassword);
    setError(undefined);
    setSetup({ totpURI: data.totpURI, backupCodes: data.backupCodes });
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: String(new FormData(e.currentTarget).get("code")).trim() });
    setBusy(false);
    if (error) return setError(copy.invalidCode);
    setError(undefined);
    setSetup(null);
    setDone(true);
    await reload();
  }

  async function regenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password: password(e) });
    setBusy(false);
    if (error || !data) return setError(copy.wrongPassword);
    setError(undefined);
    setFreshCodes(data.backupCodes);
  }

  async function disable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.twoFactor.disable({ password: password(e) });
    setBusy(false);
    if (error) return setError(copy.wrongPassword);
    setError(undefined);
    setDone(false);
    await reload();
  }

  return (
    <div className="max-w-[640px]">
      <h1 className="mb-2 text-[1.3rem] font-semibold">{copy.title}</h1>
      <p className="mb-5 text-[0.92rem] text-muted">{copy.intro}</p>
      <p className="mb-6 flex items-center gap-2 text-[0.92rem]">
        {user.twoFactorEnabled ? (
          <ShieldCheck size={18} className="text-wa-dark" aria-hidden="true" />
        ) : (
          <ShieldOff size={18} className="text-brand" aria-hidden="true" />
        )}
        {user.twoFactorEnabled ? copy.enabled : copy.disabled}
      </p>
      {done && <p role="status" className="mb-6 rounded-lg bg-wa/10 p-3 text-[0.9rem]">{copy.done}</p>}

      {!user.twoFactorEnabled && !setup && (
        <Card>
          <form onSubmit={start}>
            <Field id="password" label={copy.password} type="password" autoComplete="current-password" required />
            <FormError>{error}</FormError>
            <button type="submit" className="btn btn-primary" disabled={busy}>{copy.start}</button>
          </form>
        </Card>
      )}

      {setup && (
        <div className="flex flex-col gap-4">
          <Card title={copy.scanTitle}>
            <p className="mb-4 text-[0.88rem] text-muted">{copy.scanText}</p>
            <div className="w-fit rounded-lg bg-white p-3">
              <QRCode value={setup.totpURI} size={176} />
            </div>
            <p className="mt-4 text-[0.82rem] text-faint">{copy.manualLabel}</p>
            <code className="mt-1 block break-all font-mono text-[0.88rem]">{new URL(setup.totpURI).searchParams.get("secret")}</code>
          </Card>
          <Card title={copy.backupTitle}>
            <p className="mb-3 text-[0.88rem] text-muted">{copy.backupText}</p>
            <BackupCodes codes={setup.backupCodes} />
          </Card>
          <Card title={copy.verifyTitle}>
            <form onSubmit={verify}>
              <Field id="code" label={copy.code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
              <FormError>{error}</FormError>
              <button type="submit" className="btn btn-primary" disabled={busy}>{copy.confirm}</button>
            </form>
          </Card>
        </div>
      )}

      {user.twoFactorEnabled && (
        <div className="flex flex-col gap-4">
          <Card title={copy.regenerateTitle}>
            <p className="mb-3 text-[0.88rem] text-muted">{copy.regenerateText}</p>
            {freshCodes ? (
              <BackupCodes codes={freshCodes} />
            ) : (
              <PasswordForm id="regen-password" submit={copy.regenerate} busy={busy} onSubmit={regenerate} />
            )}
          </Card>
          <Card title={copy.disableTitle}>
            <p className="mb-3 text-[0.88rem] text-muted">{copy.disableText}</p>
            <PasswordForm id="disable-password" submit={copy.disable} busy={busy} onSubmit={disable} ghost />
          </Card>
          <FormError>{error}</FormError>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-line bg-surface p-5">
      {title && <h2 className="mb-2 font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function PasswordForm({ id, submit, busy, ghost, onSubmit }: { id: string; submit: string; busy: boolean; ghost?: boolean; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <label htmlFor={id} className="mb-1.5 block text-[0.82rem] text-muted">{copy.password}</label>
        <input id={id} name="password" type="password" autoComplete="current-password" required className="field-input" />
      </div>
      <button type="submit" className={`btn ${ghost ? "btn-ghost" : "btn-primary"}`} disabled={busy}>{submit}</button>
    </form>
  );
}

function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <ul className="mb-3 grid grid-cols-2 gap-1.5 rounded-lg bg-surface-2 p-3 font-mono text-[0.88rem] sm:grid-cols-3">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <button
        type="button"
        className="btn btn-ghost px-3 py-1.5 text-[0.86rem]"
        onClick={async () => {
          await navigator.clipboard.writeText(codes.join("\n"));
          setCopied(true);
        }}
      >
        {copied ? copy.copied : copy.copyCodes}
      </button>
    </>
  );
}
