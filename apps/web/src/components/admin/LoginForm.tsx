"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminCopy } from "@/config/admin";
import { AUTH_IS_MOCK, authClient } from "@/lib/auth";
import { AuthCard, Field, FormError } from "./AuthCard";

const copy = adminCopy;

/** E-mail + password, then the second factor (TOTP or backup code). */
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "totp" | "backup">("password");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await authClient.signIn.email({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) return setError(copy.login.invalid);
    setError(undefined);
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) setStep("totp");
    else router.replace("/admin");
  }

  async function submitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const code = String(f.get("code")).trim();
    const trustDevice = f.get("trust") === "on";
    setBusy(true);
    const { error } =
      step === "totp"
        ? await authClient.twoFactor.verifyTotp({ code, trustDevice })
        : await authClient.twoFactor.verifyBackupCode({ code, trustDevice });
    setBusy(false);
    if (error) return setError(copy.twoFactor.invalid);
    router.replace("/admin");
  }

  if (step === "password") {
    return (
      <AuthCard title={copy.login.title}>
        <form onSubmit={submitPassword}>
          <Field id="email" label={copy.login.email} type="email" autoComplete="username" required />
          <Field id="password" label={copy.login.password} type="password" autoComplete="current-password" required />
          <FormError>{error}</FormError>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>{copy.login.submit}</button>
        </form>
        <Link href="/admin/esqueci-senha" className="mt-4 block text-center text-[0.86rem] text-muted underline hover:text-ink">
          {copy.login.forgot}
        </Link>
        {AUTH_IS_MOCK && <p className="mt-5 rounded-lg bg-surface-2 p-3 text-[0.78rem] text-faint">{copy.login.mockHint}</p>}
      </AuthCard>
    );
  }

  const totp = step === "totp";
  return (
    <AuthCard title={copy.twoFactor.title}>
      <p className="mb-5 text-[0.9rem] text-muted">{totp ? copy.twoFactor.text : copy.twoFactor.backupText}</p>
      <form onSubmit={submitCode} key={step}>
        <Field
          id="code"
          label={totp ? copy.twoFactor.code : copy.twoFactor.backupCode}
          autoComplete="one-time-code"
          inputMode={totp ? "numeric" : "text"}
          pattern={totp ? "[0-9]{6}" : undefined}
          maxLength={totp ? 6 : 32}
          autoFocus
          required
        />
        <label className="mb-4 flex items-center gap-2.5 text-[0.84rem] text-muted">
          <input type="checkbox" name="trust" className="size-4 accent-brand" />
          {copy.twoFactor.trustDevice}
        </label>
        <FormError>{error}</FormError>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{copy.twoFactor.submit}</button>
      </form>
      <button
        type="button"
        onClick={() => {
          setError(undefined);
          setStep(totp ? "backup" : "totp");
        }}
        className="mt-4 block w-full text-center text-[0.86rem] text-muted underline hover:text-ink"
      >
        {totp ? copy.twoFactor.useBackup : copy.twoFactor.useTotp}
      </button>
    </AuthCard>
  );
}
