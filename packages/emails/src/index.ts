import { render } from "@react-email/render";
import { createElement, type ReactElement } from "react";
import { planInfo } from "@exactra/shared";
import { expiryCopy, newContractCopy, renewalCopy, renewalNoticeCopy, passwordResetCopy, twoFactorCopy, welcomeCopy } from "./copy";
import { firstName, formatDate, oneLine } from "./format";
import { PasswordResetEmail, TwoFactorCodeEmail, type PasswordResetEmailProps, type TwoFactorCodeEmailProps } from "./templates/auth";
import { ExpiryReminderEmail, type ExpiryReminderEmailProps } from "./templates/expiry";
import { NewContractNotice, type NewContractNoticeProps } from "./templates/new-contract";
import { WelcomeEmail, type WelcomeEmailProps } from "./templates/welcome";
import { expiryText, footer, newContractText, passwordResetText, twoFactorText, welcomeText } from "./text";
import {
  documentRejectedMessage,
  documentsOpenMessage,
  documentsReminderMessage,
  guideDueMessage,
  guidePublishedMessage,
  magicLinkMessage,
  portalInviteMessage,
  portalText,
  retentionNoticeMessage,
} from "./portal";
import { PortalEmail, type PortalMessage } from "./templates/portal";

export type { ContractSummary, WelcomeEmailProps } from "./templates/welcome";
export type { NewContractNoticeProps } from "./templates/new-contract";
export type { PasswordResetEmailProps, TwoFactorCodeEmailProps } from "./templates/auth";
export type { ExpiryReminderEmailProps } from "./templates/expiry";
export type {
  DocumentRejectedProps,
  DocumentsOpenProps,
  DocumentsReminderProps,
  GuideDueProps,
  GuidePublishedProps,
  GuideSummary,
  MagicLinkProps,
  PortalInviteProps,
  RetentionNoticeProps,
} from "./portal";

export type EmailContent = { subject: string; html: string; text: string };

/** React escapes every interpolated string, so user data never becomes markup. */
async function build(subject: string, element: ReactElement, text: string): Promise<EmailContent> {
  return { subject: oneLine(subject), html: await render(element), text };
}

/** To the customer, when the contract becomes ACTIVE. */
export const renderWelcomeEmail = (props: WelcomeEmailProps) =>
  build((props.renewal ? renewalCopy : welcomeCopy).subject(firstName(props.customerName)), createElement(WelcomeEmail, props), welcomeText(props));

/** Internal notice to ADMIN_NOTIFY_EMAIL, when a contract becomes ACTIVE. */
export const renderNewContractNotice = (props: NewContractNoticeProps) =>
  build((props.renewal ? renewalNoticeCopy : newContractCopy).subject(props.customer.name, planInfo(props.contract.plan).name), createElement(NewContractNotice, props), newContractText(props));

/** Better Auth emailAndPassword.sendResetPassword. */
export const renderPasswordResetEmail = (props: PasswordResetEmailProps) => build(passwordResetCopy.subject, createElement(PasswordResetEmail, props), passwordResetText(props));

/** Better Auth twoFactor otpOptions.sendOTP. */
export const renderTwoFactorCodeEmail = (props: TwoFactorCodeEmailProps) => build(twoFactorCopy.subject(props.code), createElement(TwoFactorCodeEmail, props), twoFactorText(props));

/** Daily job, before a prepaid (Pix/boleto) contract ends. */
export const renderExpiryReminderEmail = (props: ExpiryReminderEmailProps) =>
  build(expiryCopy.subject(formatDate(props.contract.endsAt)), createElement(ExpiryReminderEmail, props), expiryText(props));

// ---------- Customer area ----------

function portal<P>(message: (props: P) => PortalMessage) {
  return (props: P) => {
    const m = message(props);
    return build(m.subject, createElement(PortalEmail, { m }), portalText(m, footer));
  };
}

/** Activation link: first password for the customer area (manual customers and resent invites). */
export const renderPortalInviteEmail = portal(portalInviteMessage);
/** Better Auth magicLink sendMagicLink. */
export const renderMagicLinkEmail = portal(magicLinkMessage);
export const renderGuidePublishedEmail = portal(guidePublishedMessage);
export const renderGuideDueEmail = portal(guideDueMessage);
export const renderDocumentsOpenEmail = portal(documentsOpenMessage);
export const renderDocumentsReminderEmail = portal(documentsReminderMessage);
export const renderDocumentRejectedEmail = portal(documentRejectedMessage);
export const renderRetentionNoticeEmail = portal(retentionNoticeMessage);
