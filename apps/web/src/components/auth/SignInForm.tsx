"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@exactra/shared";
import { authCopy } from "@/config/auth";
import { AUTH_IS_MOCK, authClient, homeFor } from "@/lib/auth";
import { AuthCard, Field, FormError } from "./AuthCard";

const copy = authCopy;
type Step = "password" | "link" | "linkSent" | "totp" | "otp" | "backup";

/** Only paths inside the site, so ?next= cannot send people elsewhere. */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

/**
 * One entrance for customers and the team. E-mail + password (then the second factor: app,
 * e-mail code or backup code), or a sign-in link by e-mail for customers. The role decides
 * where it lands: /admin for the team, /app for customers.
 */
export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [step, setStep] = useState<Step>("password");
  const [methods, setMethods] = useState<string[]>(["totp"]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(params.get("error") ? copy.login.linkError : undefined);
  const [busy, setBusy] = useState(false);

  // Already signed in: go straight in.
  useEffect(() => {
    authClient.getSession().then(({ data }) => data?.user && router.replace(next ?? homeFor(data.user.role)));
  }, [router, next]);

  async function enter() {
    const { data } = await authClient.getSession();
    const role = data?.user.role;
    // A customer cannot land on /admin (and the reverse) even with ?next=.
    const fits = next && (role === "admin" ? next.startsWith("/admin") : next.startsWith("/app"));
    router.replace(fits ? next : homeFor(role));
  }

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
      // Accounts without an authenticator app only have the e-mail code.
      if (available.includes("totp")) setStep("totp");
      else await goTo("otp");
    } else await enter();
  }

  async function submitLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email"));
    setEmail(value);
    setBusy(true);
    // Same answer whatever the e-mail, so the form does not reveal who has access.
    await authClient.signIn.magicLink({
      email: value,
      callbackURL: `${window.location.origin}${next?.startsWith("/app") ? next : "/app"}`,
      errorCallbackURL: `${window.location.origin}/entrar?error=link`,
    });
    setBusy(false);
    setError(undefined);
    setStep("linkSent");
  }

  async function goTo(nextStep: Step) {
    setError(undefined);
    setStep(nextStep);
    if (nextStep !== "otp") return;
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
    await enter();
  }

  const help = (
    <div className="mt-6 border-t border-line pt-5 text-center text-[0.84rem] text-muted">
      <p>{copy.login.help}</p>
      <a href={whatsappLink(copy.login.helpMessage)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 font-medium text-ink underline">
        <MessageCircle size={15} aria-hidden="true" />
        {copy.login.helpCta}
      </a>
    </div>
  );

  if (step === "password" || step === "link" || step === "linkSent") {
    const l = copy.login;
    return (
      <AuthCard title={l.title} lede={l.lede}>
        <div role="tablist" aria-label={l.title} className="mb-5 grid grid-cols-2 rounded-full bg-surface-2 p-1 text-[0.86rem]">
          {(
            [
              ["password", l.usePassword],
              ["link", l.useLink],
            ] as const
          ).map(([s, label]) => {
            const active = s === "password" ? step === "password" : step !== "password";
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => goTo(s)}
                className="rounded-full px-3 py-2 font-medium text-muted transition-colors aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-[0_1px_2px_rgba(15,33,51,0.12)]"
              >
                {label}
              </button>
            );
          })}
        </div>

        {step === "password" && (
          <form onSubmit={submitPassword}>
            <Field id="email" label={l.email} type="email" autoComplete="username" defaultValue={email} required />
            <Field id="password" label={l.password} type="password" autoComplete="current-password" required />
            <FormError>{error}</FormError>
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>{l.submit}</button>
            <Link href="/entrar/esqueci-senha" className="mt-4 block text-center text-[0.86rem] text-muted underline hover:text-ink">{l.forgot}</Link>
          </form>
        )}
        {step === "link" && (
          <form onSubmit={submitLink}>
            <p className="mb-4 text-[0.9rem] text-muted">{l.linkText}</p>
            <Field id="email" label={l.email} type="email" autoComplete="username" defaultValue={email} required />
            <FormError>{error}</FormError>
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>{l.linkSubmit}</button>
          </form>
        )}
        {step === "linkSent" && <p role="status" className="rounded-xl bg-ok-tint p-4 text-[0.9rem] text-ink">{l.linkSent(email)}</p>}

        <p className="mt-5 text-[0.8rem] text-faint">{l.noAccess}</p>
        {AUTH_IS_MOCK && <p className="mt-4 rounded-lg bg-surface-2 p-3 text-[0.78rem] text-faint">{l.mockHint}</p>}
        {help}
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
