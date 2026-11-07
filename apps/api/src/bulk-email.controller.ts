import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { bulkEmailSchema, emailHistoryQuerySchema, type BulkEmailInput } from '@exactra/shared';
import { setTimeout } from 'node:timers/promises';
import { prisma } from './db.js';
import { sendEmail } from './email.js';
import { ZodPipe } from './zod.pipe.js';

export function messageHtml(message: string): string {
  return `<div style="white-space:pre-wrap">${message.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)}</div>`;
}

@Roles(['admin'])
@Controller('admin/emails')
export class BulkEmailController {
  @Get('recipients')
  recipients() {
    return prisma.customer.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
  }

  @Get()
  async history(@Query(new ZodPipe(emailHistoryQuerySchema)) query: { page: number }) {
    const pageSize = 20;
    const [items, total] = await prisma.$transaction([
      prisma.emailCampaign.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * pageSize, take: pageSize, include: { _count: { select: { recipients: true } } } }),
      prisma.emailCampaign.count(),
    ]);
    return { items: items.map(({ message: _message, _count, ...c }) => ({ ...c, createdAt: c.createdAt.toISOString(), recipientCount: _count.recipients })), total, page: query.page, pageSize };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id }, include: { recipients: { orderBy: [{ name: 'asc' }, { id: 'asc' }] } } });
    if (!campaign) throw new NotFoundException();
    const { recipients, ...c } = campaign;
    return { ...c, createdAt: c.createdAt.toISOString(), recipientCount: recipients.length, recipients: recipients.map((r) => ({ id: r.id, customerId: r.customerId, name: r.name, email: r.email, status: r.status, updatedAt: r.updatedAt.toISOString() })) };
  }

  @Post()
  async send(@Body(new ZodPipe(bulkEmailSchema)) input: BulkEmailInput, @Session() session: UserSession) {
    const ids = [...new Set(input.customerIds)];
    const customers = await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
    if (customers.length !== ids.length) throw new BadRequestException('Um cliente não existe mais. Atualize a lista antes de enviar.');
    const campaign = await prisma.emailCampaign.create({ data: {
      subject: input.subject, message: input.message, createdBy: session.user.email,
      recipients: { create: customers.map((c) => ({ customerId: c.id, name: c.name, email: c.email })) },
    }, include: { recipients: true } });
    const html = messageHtml(input.message);
    let sent = 0;
    const failedCustomerIds: string[] = [];
    // shortcut: synchronous sends, use a durable queue when campaigns exceed 1000 customers.
    for (const [index, recipient] of campaign.recipients.entries()) {
      if (index) await setTimeout(600);
      let providerMessageId: string | undefined;
      try {
        providerMessageId = await sendEmail({ to: recipient.email, subject: input.subject, text: input.message, html, tags: [{ name: 'bulk_recipient_id', value: recipient.id }] });
      } catch {
        await prisma.emailRecipient.updateMany({ where: { id: recipient.id, lastEventAt: null }, data: { status: 'FAILED' } });
        failedCustomerIds.push(recipient.customerId);
        continue;
      }
      // Dev without Resend only logs: it must not claim the e-mail was sent.
      if (providerMessageId) {
        await prisma.emailRecipient.updateMany({ where: { id: recipient.id, lastEventAt: null }, data: { status: 'SENT', providerMessageId } });
        sent++;
      }
    }
    return { campaignId: campaign.id, sent, failedCustomerIds };
  }
}
