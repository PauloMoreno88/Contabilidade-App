"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminCopy } from "@/config/admin";
import { AUTH_IS_MOCK, authClient } from "@/lib/auth";
import { AuthCard, Field, FormError } from "./AuthCard";

const copy = adminCopy;
type Step = "password" | "totp" | "otp" | "backup";

/** E-mail + password, then the second factor: app (TOTP), e-mail code (OTP) or backup code. */
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [methods, setMethods] = useState<string[]>(["totp"]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEmail(String(f.get("email")));
    setBusy(true);
    const { data, error } = await authClient.signIn.email({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) return setError(copy.login.invalid);
    setError(undefined);
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      const available = "twoFactorMethods" in data && Array.isArray(data.twoFactorMethods) ? (data.twoFactorMethods as string[]) : ["totp"];
      setMethods(available);
      // Admins without an authenticator app only have the e-mail code.
      if (available.includes("totp")) setStep("totp");
      else await goTo("otp");
    } else router.replace("/admin");
  }

  async function goTo(next: Step) {
    setError(undefined);
    setStep(next);
    if (next !== "otp") return;
    const { error } = await authClient.twoFactor.sendOtp();
    if (error) setError(copy.twoFactor.otpSendError);
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
        : step === "otp"
          ? await authClient.twoFactor.verifyOtp({ code, trustDevice })
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

  const t = copy.twoFactor;
  const text = { totp: t.text, otp: t.otpText(email), backup: t.backupText }[step];
  const label = { totp: t.code, otp: t.otpCode, backup: t.backupCode }[step];
  const numeric = step !== "backup";
  // Other ways to finish signing in, offered as links under the form.
  const alternatives = (
    [
      ["totp", t.useTotp],
      ["otp", t.useOtp],
      ["backup", t.useBackup],
    ] as const
  ).filter(([s]) => s !== step && (s === "backup" || methods.includes(s)));

  return (
    <AuthCard title={t.title}>
      <p className="mb-5 text-[0.9rem] text-muted">{text}</p>
      <form onSubmit={submitCode} key={step}>
        <Field
          id="code"
          label={label}
          autoComplete="one-time-code"
          inputMode={numeric ? "numeric" : "text"}
          pattern={numeric ? "[0-9]{6}" : undefined}
          maxLength={numeric ? 6 : 32}
          autoFocus
          required
        />
        <label className="mb-4 flex items-center gap-2.5 text-[0.84rem] text-muted">
          <input type="checkbox" name="trust" className="size-4 accent-brand" />
          {t.trustDevice}
        </label>
        <FormError>{error}</FormError>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{t.submit}</button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-2 text-[0.86rem]">
        {step === "otp" && (
          <button type="button" onClick={() => goTo("otp")} className="text-muted underline hover:text-ink">{t.resendOtp}</button>
        )}
        {alternatives.map(([s, label]) => (
          <button key={s} type="button" onClick={() => goTo(s)} className="text-muted underline hover:text-ink">{label}</button>
        ))}
      </div>
    </AuthCard>
  );
}
