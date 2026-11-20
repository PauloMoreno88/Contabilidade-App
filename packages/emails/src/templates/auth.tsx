import { Section, Text } from "@react-email/components";
import { passwordResetCopy, twoFactorCopy } from "../copy";
import { firstName, safeUrl } from "../format";
import { color, FallbackLink, H1, Layout, mono, P, PrimaryButton, Signature } from "../ui";

export type PasswordResetEmailProps = {
  name: string;
  /** Reset link from Better Auth's sendResetPassword({ url }). */
  url: string;
  /** Token lifetime, if known (Better Auth: resetPasswordTokenExpiresIn / 60). */
  expiresInMinutes?: number;
};

export function PasswordResetEmail({ name, url, expiresInMinutes }: PasswordResetEmailProps) {
  const href = safeUrl(url);
  const copy = passwordResetCopy;
  return (
    <Layout preview={copy.preview}>
      <H1>{copy.title}</H1>
      <P>{copy.lede(firstName(name))}</P>
      <Section style={{ margin: "8px 0 20px" }}>
        <PrimaryButton href={href}>{copy.cta}</PrimaryButton>
      </Section>
      <P small>{expiresInMinutes ? copy.expires(expiresInMinutes) : copy.expiresUnknown}</P>
      <P small style={{ margin: "0 0 4px" }}>{copy.fallback}</P>
      <FallbackLink href={href} />
      <P small style={{ margin: "20px 0 0" }}>{copy.ignore}</P>
      <Signature />
    </Layout>
  );
}

export type TwoFactorCodeEmailProps = {
  name?: string;
  /** OTP from Better Auth's twoFactor otpOptions.sendOTP({ otp }). */
  code: string;
  /** OTP lifetime, if known (Better Auth: otpOptions.period). */
  expiresInMinutes?: number;
};

export function TwoFactorCodeEmail({ name, code, expiresInMinutes }: TwoFactorCodeEmailProps) {
  const copy = twoFactorCopy;
  return (
    <Layout preview={copy.preview}>
      <H1>{copy.title}</H1>
      <P>{copy.lede(name ? firstName(name) : undefined)}</P>
      <Section className="x-soft" style={{ backgroundColor: color.soft, borderRadius: 10, padding: "18px 20px", margin: "8px 0 18px" }}>
        <Text className="x-text" style={{ margin: 0, fontFamily: mono, fontSize: 32, lineHeight: "40px", fontWeight: 600, letterSpacing: "0.3em", color: color.text }}>
          {code}
        </Text>
      </Section>
      <P small>{expiresInMinutes ? copy.expires(expiresInMinutes) : copy.expiresUnknown}</P>
      <P small style={{ margin: 0 }}>{copy.ignore}</P>
      <Signature />
    </Layout>
  );
}
