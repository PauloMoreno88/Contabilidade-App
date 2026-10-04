import { render } from "@react-email/render";
import { createElement, type ReactElement } from "react";
import { PLANS } from "@exactra/shared";
import { expiryCopy, newContractCopy, passwordResetCopy, twoFactorCopy, welcomeCopy } from "./copy";
import { firstName, formatDate, oneLine } from "./format";
import { PasswordResetEmail, TwoFactorCodeEmail, type PasswordResetEmailProps, type TwoFactorCodeEmailProps } from "./templates/auth";
import { ExpiryReminderEmail, type ExpiryReminderEmailProps } from "./templates/expiry";
import { NewContractNotice, type NewContractNoticeProps } from "./templates/new-contract";
import { WelcomeEmail, type WelcomeEmailProps } from "./templates/welcome";
import { expiryText, newContractText, passwordResetText, twoFactorText, welcomeText } from "./text";

export type { ContractSummary, WelcomeEmailProps } from "./templates/welcome";
export type { NewContractNoticeProps } from "./templates/new-contract";
export type { PasswordResetEmailProps, TwoFactorCodeEmailProps } from "./templates/auth";
export type { ExpiryReminderEmailProps } from "./templates/expiry";

export type EmailContent = { subject: string; html: string; text: string };

/** React escapes every interpolated string, so user data never becomes markup. */
async function build(subject: string, element: ReactElement, text: string): Promise<EmailContent> {
  return { subject: oneLine(subject), html: await render(element), text };
}

/** To the customer, when the contract becomes ACTIVE. */
export const renderWelcomeEmail = (props: WelcomeEmailProps) =>
  build(welcomeCopy.subject(firstName(props.customerName)), createElement(WelcomeEmail, props), welcomeText(props));

/** Internal notice to ADMIN_NOTIFY_EMAIL, when a contract becomes ACTIVE. */
export const renderNewContractNotice = (props: NewContractNoticeProps) =>
  build(newContractCopy.subject(props.customer.name, PLANS[props.contract.plan].name), createElement(NewContractNotice, props), newContractText(props));

/** Better Auth emailAndPassword.sendResetPassword. */
export const renderPasswordResetEmail = (props: PasswordResetEmailProps) => build(passwordResetCopy.subject, createElement(PasswordResetEmail, props), passwordResetText(props));

/** Better Auth twoFactor otpOptions.sendOTP. */
export const renderTwoFactorCodeEmail = (props: TwoFactorCodeEmailProps) => build(twoFactorCopy.subject(props.code), createElement(TwoFactorCodeEmail, props), twoFactorText(props));

/** Daily job, before a prepaid (Pix/boleto) contract ends. */
export const renderExpiryReminderEmail = (props: ExpiryReminderEmailProps) =>
  build(expiryCopy.subject(formatDate(props.contract.endsAt)), createElement(ExpiryReminderEmail, props), expiryText(props));
