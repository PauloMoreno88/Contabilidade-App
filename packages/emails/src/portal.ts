import { competenceLabel, GUIDE_TYPE_LABELS, REJECTION_REASONS, type GuideType, type RejectionReason } from "@exactra/shared";
import { brand, portalCopy as copy } from "./copy";
import { firstName, formatBRL, formatDay } from "./format";
import type { PortalMessage } from "./templates/portal";

/** Builders for the customer area e-mails. Pure: the API passes data and links, nothing is looked up here. */

export type GuideSummary = { type: GuideType; label?: string | null; competence: string; amountCents: number; dueDate: string };

const guideName = (g: GuideSummary) => g.label || GUIDE_TYPE_LABELS[g.type].replace(/ \(.*\)$/, "");
const guideRows = (g: GuideSummary): PortalMessage["rows"] => [
  [copy.rows.guide, guideName(g)],
  [copy.rows.competence, competenceLabel(g.competence)],
  [copy.rows.amount, formatBRL(g.amountCents), true],
  [copy.rows.dueDate, formatDay(g.dueDate), true],
];

export type PortalInviteProps = { name: string; companyName: string | null; url: string; expiresInDays: number };
export const portalInviteMessage = ({ name, companyName, url, expiresInDays }: PortalInviteProps): PortalMessage => ({
  subject: copy.invite.subject,
  preview: copy.invite.preview,
  title: copy.invite.title(firstName(name)),
  lede: copy.invite.lede(companyName),
  cta: { label: copy.invite.cta, url },
  notes: [copy.invite.expires(expiresInDays), copy.invite.fallback],
  fallbackLink: url,
});

export type MagicLinkProps = { name: string; url: string; expiresInMinutes: number };
export const magicLinkMessage = ({ name, url, expiresInMinutes }: MagicLinkProps): PortalMessage => ({
  subject: copy.magicLink.subject,
  preview: copy.magicLink.preview,
  title: copy.magicLink.title,
  lede: copy.magicLink.lede(firstName(name)),
  cta: { label: copy.magicLink.cta, url },
  notes: [copy.magicLink.expires(expiresInMinutes), copy.magicLink.ignore],
});

export type GuidePublishedProps = { customerName: string; guide: GuideSummary; url: string };
export const guidePublishedMessage = ({ customerName, guide, url }: GuidePublishedProps): PortalMessage => ({
  subject: copy.guidePublished.subject(guideName(guide), formatDay(guide.dueDate)),
  preview: copy.guidePublished.preview,
  title: copy.guidePublished.title,
  lede: copy.guidePublished.lede(firstName(customerName)),
  rows: guideRows(guide),
  cta: { label: copy.guidePublished.cta, url },
  notes: [copy.guidePublished.note],
});

export type GuideDueProps = GuidePublishedProps & { daysLeft: number };
export const guideDueMessage = ({ customerName, guide, url, daysLeft }: GuideDueProps): PortalMessage => ({
  subject: copy.guideDue.subject(guideName(guide), daysLeft),
  preview: copy.guideDue.preview,
  title: copy.guideDue.title(daysLeft),
  lede: copy.guideDue.lede(firstName(customerName)),
  rows: guideRows(guide),
  cta: { label: copy.guideDue.cta, url },
  notes: [copy.guideDue.note],
});

export type DocumentsOpenProps = { customerName: string; competence: string; dueDate: string; items: string[]; url: string };
export const documentsOpenMessage = ({ customerName, competence, dueDate, items, url }: DocumentsOpenProps): PortalMessage => ({
  subject: copy.documentsOpen.subject(competenceLabel(competence)),
  preview: copy.documentsOpen.preview,
  title: copy.documentsOpen.title(competenceLabel(competence)),
  lede: copy.documentsOpen.lede(firstName(customerName), formatDay(dueDate)),
  list: { title: copy.documentsOpen.listTitle, items },
  cta: { label: copy.documentsOpen.cta, url },
});

export type DocumentsReminderProps = DocumentsOpenProps & { daysLeft: number };
export const documentsReminderMessage = ({ customerName, competence, dueDate, items, url, daysLeft }: DocumentsReminderProps): PortalMessage => ({
  subject: copy.documentsReminder.subject(items.length, competenceLabel(competence)),
  preview: copy.documentsReminder.preview,
  title: copy.documentsReminder.title(daysLeft),
  lede: copy.documentsReminder.lede(firstName(customerName), formatDay(dueDate)),
  list: { title: copy.documentsReminder.listTitle, items },
  cta: { label: copy.documentsReminder.cta, url },
});

export type DocumentRejectedProps = { customerName: string; competence: string; title: string; reason: RejectionReason; note?: string | null; url: string };
export const documentRejectedMessage = ({ customerName, competence, title, reason, note, url }: DocumentRejectedProps): PortalMessage => ({
  subject: copy.documentRejected.subject(title),
  preview: copy.documentRejected.preview,
  title: copy.documentRejected.title,
  lede: copy.documentRejected.lede(firstName(customerName), title, competenceLabel(competence)),
  rows: [[copy.documentRejected.reason, REJECTION_REASONS[reason]], ...(note ? [[copy.documentRejected.note, note] as [string, string]] : [])],
  cta: { label: copy.documentRejected.cta, url },
});

export type RetentionNoticeProps = { customerName: string; competence: string; deletesOn: string; url: string };
export const retentionNoticeMessage = ({ customerName, competence, deletesOn, url }: RetentionNoticeProps): PortalMessage => ({
  subject: copy.retention.subject(competenceLabel(competence)),
  preview: copy.retention.preview,
  title: copy.retention.title(competenceLabel(competence)),
  lede: copy.retention.lede(firstName(customerName), formatDay(deletesOn)),
  cta: { label: copy.retention.cta, url },
  notes: [copy.retention.note],
});

/** Plain-text version of any customer area e-mail. */
export function portalText(m: PortalMessage, footer: string): string {
  const blocks = [
    m.title,
    m.lede,
    m.rows?.map(([k, v]) => `${k}: ${v}`).join("\n"),
    m.list && `${m.list.title.toUpperCase()}\n${m.list.items.map((i) => `- ${i}`).join("\n")}`,
    `${m.cta.label}:\n${m.cta.url}`,
    ...(m.notes?.filter((n) => n !== copy.invite.fallback) ?? []),
    brand.signature,
    footer,
  ];
  return blocks.filter(Boolean).join("\n\n") + "\n";
}
